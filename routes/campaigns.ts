import * as express from 'express';
import * as moment from 'moment';

import * as C from '../glob/cf';
import HC from '../glob/hc';
import ERR from '../glob/err';
import * as CONN from '../glob/conn';
import _ from '../utils/_';
import ajv2 from '../utils/ajv2';

// Import models here
import { Campaign, ICampaign, Promotion, IRuleConfig, IRewardConfig } from '../models';

// Import services here
import AuthServ from '../serv/auth';
import RuleServ from '../serv/rules';
import RewardServ from '../serv/rewards';
import { PromotionServ } from '../serv/promotion';

const router = express.Router();
const _ajv = ajv2();

// Start API here
const addCampaignBody = _ajv({
    '+@name': 'string',
    '+@promotionsCount': 'integer|>=1|<=100000',
    // '@charset': 'string',
    '@pattern': 'string',
    '+rules': {
        type: 'array',
        '@items': {
            '+@type': 'string',
            '+data': {},
            '++': false
        }
    },
    '+rewards': {
        type: 'array',
        '@items': {
            '+@type': 'string',
            '+data': {},
            '++': false
        }
    },
    '@metadata': {},
    '+@start_at': 'integer|>0',
    '+@expired_at': 'integer|>0',
    '++': false
});
router.post('/', _.validBody(addCampaignBody), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const promotionCount: number = _.parseIntNull(req.body.promotionsCount) || HC.DEFAULT_PROMO_COUNT;

    const pattern = req.body.pattern || HC.DEFAULT_PROMO_PATTERN;
    const charset = HC.HUMAN32_ALPHABET;
    if (!PromotionServ.isFeasiblePattern(pattern, charset, promotionCount)) {
        throw _.logicError('Cannot create campaign', 'Not enough random space to generate promotion code', 400, ERR.NOT_ENOUGH_CODE_SPACE);
    }

    const rules: IRuleConfig[] = req.body.rules;
    const isValidRules = await RuleServ.isValidConfig(rules)
    if (!isValidRules) {
        throw _.logicError('Cannot create campaign', 'Invalid rules format', 400, ERR.INVALID_RULES_FORMAT);
    }

    const rewards: IRewardConfig[] = req.body.rewards;
    const isValidRewards = await RewardServ.isValidConfig(rewards);
    if (!isValidRewards) {
        throw _.logicError('Cannot create campaign', 'Invalid rewards format', 400, ERR.INVALID_REWARDS_FORMAT);
    }

    const startAt: number = req.body.start_at;
    const expiredAt: number = req.body.expired_at;

    if (expiredAt < startAt) {
        throw _.logicError('Cannot create campaign', 'Invalid time', 400, ERR.DATA_MISMATCH);
    }

    const campaign: ICampaign = {
        user: req.session.user._id,
        name: req.body.name,
        charset: HC.HUMAN32_ALPHABET,
        pattern: req.body.pattern || HC.DEFAULT_PROMO_PATTERN,
        rules: rules,
        rewards: rewards,
        metadata: {},
        created_at: _.nowInSeconds(),
        start_at: req.body.start_at,
        expired_at: req.body.expired_at
    }

    const insertResult = await Campaign.insertOne(campaign);
    campaign._id = insertResult.insertedId;

    await PromotionServ.generatePromotions(campaign, promotionCount);

    return HC.SUCCESS;
}));

const editCampaignBody = _ajv({
    '@start_at': 'integer|>0',
    '@expired_at': 'integer|>0',
    '++': false
})
router.put('/:id', AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const campaignId = _.mObjId(req.params.id);
    const campaign = await Campaign.findOne({_id: campaignId, user: req.session.user._id});

    if (_.isEmpty(campaign)) {
        throw _.logicError('Cannot edit campaign', `Campaign not found`, 400, ERR.OBJECT_NOT_FOUND);
    }

    const update: any = {};
    if (req.body.start_at != null) {
        update.start_at = req.body.start_at;
    }

    if (req.body.expired_at != null) {
        update.expired_at = req.body.expired_at;
    }

    if (_.isEmpty(update)) {
        return HC.SUCCESS;
    }

    const startAt = update.start_at || campaign.start_at;
    const expiredAt = update.expired_at || campaign.expired_at;
    if (expiredAt < startAt) {
        throw _.logicError('Cannot create campaign', 'Invalid time', 400, ERR.DATA_MISMATCH);
    }
    
    const result = await Campaign.update({_id: campaignId}, update);

    // update for promotion if invole to time
    const promotionUpdate = _.filterDict(update, (k, v) => k == 'expired_at' || k == 'start_at');
    if (!_.isEmpty(promotionUpdate)) {
        await Promotion.updateMany({campaign: campaignId}, promotionUpdate);
    }

    return HC.SUCCESS;
}));

router.get('/', AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const campaigns = await Campaign.find<ICampaign>({}).toArray();

    return campaigns;
}));


export default router;