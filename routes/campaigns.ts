import * as express from 'express';
import * as moment from 'moment';

import * as C from '../glob/cf';
import HC from '../glob/hc';
import ERR from '../glob/err';
import * as CONN from '../glob/conn';
import _ from '../utils/_';
import ajv2 from '../utils/ajv2';

// Import models here
import { Campaign, ICampaign, Promotion } from '../models';

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
    '+@rules': {},
    '+@rewards': {},
    '@metadata': {},
    '++': false
});
router.post('/', _.validBody(addCampaignBody), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const promotionCount: number = _.parseIntNull(req.body.promotionsCount) || HC.DEFAULT_PROMO_COUNT;

    const pattern = req.body.pattern || HC.DEFAULT_PROMO_PATTERN;
    const charset = HC.HUMAN32_ALPHABET;
    if (!PromotionServ.isFeasiblePattern(pattern, charset, promotionCount)) {
        throw _.logicError('Cannot create campaign', 'Not enough random space to generate promotion code', 400, ERR.NOT_ENOUGH_CODE_SPACE);
    }

    const rules: any = req.body.rules;
    const isValidRules = await RuleServ.isValidConfig(rules)
    if (!isValidRules) {
        throw _.logicError('Cannot create campaign', 'Invalid rules format', 400, ERR.INVALID_RULES_FORMAT);
    }

    const rewards: any = req.body.rewards;
    const isValidRewards = await RewardServ.isValidConfig(rewards);
    if (!isValidRewards) {
        throw _.logicError('Cannot create campaign', 'Invalid rewards format', 400, ERR.INVALID_REWARDS_FORMAT);
    }

    const campaign: ICampaign = {
        user: req.session.user._id,
        name: req.body.name,
        charset: HC.HUMAN32_ALPHABET,
        pattern: req.body.pattern || HC.DEFAULT_PROMO_PATTERN,
        rules: rules,
        rewards: rewards,
        metadata: {}
    }

    const insertResult = await Campaign.insertOne(campaign);
    campaign._id = insertResult.insertedId;

    await PromotionServ.generatePromotions(campaign, promotionCount);

    return HC.SUCCESS;
}));

export default router;