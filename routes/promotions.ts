import * as express from 'express';
import * as moment from 'moment';

import * as C from '../glob/cf';
import HC from '../glob/hc';
import ERR from '../glob/err';
import * as CONN from '../glob/conn';
import _ from '../utils/_';
import ajv2 from '../utils/ajv2';

// Import models here
import { Campaign, ICampaign, Promotion, IPromotion, IPromoTransaction, IRedemption, Redemption, PROMOTION_STATUSES, PROMOTION_STATUS, IRuleConfig, IRewardConfig } from '../models';

// Import services here
import AuthServ from '../serv/auth';
import RuleServ from '../serv/rules';
import RewardServ from '../serv/rewards';
import { PromotionServ } from '../serv/promotion';
import { ObjectID } from 'bson';

const router = express.Router();
const _ajv = ajv2();

// Start API here
router.get('/:codes', AuthServ.authPromoApp(), _.routeAsync(async (req) => {
    const codes: string[] = req.params.codes.split(',');
    const user = req.session.user;
    console.log(codes);
    console.log(user);
    const promotions = await Promotion.find({ user: user._id, code: { $in: codes } }).toArray();
    return promotions;
}));

const tryPromotionBody = _ajv({
    '+transactions': {
        'type': 'array',
        '@items': {
            '@transactionId': 'string',
            '+@transactionData': {},
            '++': false
        },
        'minItem': 1
    },
    '+@apiKey': 'string'
});
router.post('/:code/tries', _.validBody(tryPromotionBody), AuthServ.authPromoApp(), _.routeAsync(async (req) => {
    const user = req.session.user;
    const code = req.params.code;
    const time = moment.unix(req.body.datetime).unix() || _.nowInSeconds();

    const promotion = await Promotion.findOne<IPromotion>({ user: user._id, code: code });
    if (_.isEmpty(promotion)) {
        throw _.logicError('Cannot try promotion code', `Promotion ${code} not found`, 400, ERR.OBJECT_NOT_FOUND, code);
    }

    if (promotion.status == 'DISABLED') {
        throw _.logicError('Cannot try promotion code', `Promotion is disabled`, 400, ERR.PROMOTION_CODE_IS_DISABLED)
    }

    if (time < promotion.start_at) {
        throw _.logicError('Cannot try promotion code', `Promotion does not start yet`, 400, ERR.PROMOTION_CODE_DOES_NOT_START_YET)
    }

    if (time >= promotion.expired_at) {
        throw _.logicError('Cannot try promotion code', `Promotion is expired`, 400, ERR.PROMOTION_CODE_IS_EXPIRED)
    }

    const transactionData: any[] = req.body.transactions;
    const transactions: IPromoTransaction[] = transactionData.map(trD => ({
        id: trD.transactionId || _.uniqueId(),
        time: moment.unix(time).toDate(),
        data: trD.transactionData
    }));

    let dataValid = await Promise.all(transactions.map(tr => RuleServ.isValidTransactionData(promotion.rules, tr.data)));
    console.log('..............');
    console.log(dataValid);
    if (dataValid.some(v => !v)) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }

    dataValid = await Promise.all(transactions.map(tr => RewardServ.isValidTransactionData(promotion.rewards, tr.data)));
    if (dataValid.some(v => !v)) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }

    // valid promotion usage data
    const useableResult = await RuleServ.isUsable(promotion, transactions);
    if (!useableResult.some(u => u.isUsable)) {
        throw _.logicError('Cannot try promotion code', `Promotion code is not available`, 400, ERR.PROMOTION_CODE_IS_UNUSABLE)
    }

    // apply promotion
    const usableTransactions = useableResult.filter(ur => ur.isUsable).map(ur => ur.transaction);
    const rewarded = await Promise.all(usableTransactions.map(tr => RewardServ.applyPromotion(promotion.rewards, tr.data)));
    return {
        promotion: promotion,
        transactions: useableResult.map(ur => ({
            isUsable: ur.isUsable,
            transaction: ur.transaction,
            rewarded: ur.isUsable ? rewarded[usableTransactions.findIndex(tr => tr.id == ur.transaction.id)] : ur.transaction.data
        }))
    }
}));

const redeemPromotionBody = _ajv({
    '@transactionId': 'string',
    '+@transactionData': {},
    '+@apiKey': 'string'
});
router.post('/:code/redemptions', _.validBody(redeemPromotionBody), AuthServ.authPromoApp(), _.routeAsync(async (req) => {
    const user = req.session.user;
    const code = req.params.code;
    const time = moment.unix(req.body.datetime).unix() || _.nowInSeconds();

    const transaction: IPromoTransaction = {
        id: req.body.transactionId || _.uniqueId(),
        time: moment.unix(time).toDate(),
        data: req.body.transactionData
    }

    const promotion = await Promotion.findOne<IPromotion>({ user: user._id, code: code });
    if (_.isEmpty(promotion)) {
        throw _.logicError('Cannot redeem promotion code', `Promotion ${code} not found`, 400, ERR.OBJECT_NOT_FOUND, code);
    }

    if (promotion.status == 'DISABLED') {
        throw _.logicError('Cannot redeem promotion code', `Promotion is disabled`, 400, ERR.PROMOTION_CODE_IS_DISABLED)
    }

    if (time < promotion.start_at) {
        throw _.logicError('Cannot redeem promotion code', `Promotion does not start yet`, 400, ERR.PROMOTION_CODE_DOES_NOT_START_YET)
    }

    if (time >= promotion.expired_at) {
        throw _.logicError('Cannot redeem promotion code', `Promotion is expired`, 400, ERR.PROMOTION_CODE_IS_EXPIRED)
    }

    let isDataValid = await RuleServ.isValidTransactionData(promotion.rules, transaction.data);
    if (!isDataValid) {
        throw _.logicError('Cannot redeem promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }

    isDataValid = await RewardServ.isValidTransactionData(promotion.rewards, transaction.data);
    if (!isDataValid) {
        throw _.logicError('Cannot redeem promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }

    const rewarded = await RewardServ.applyPromotion(promotion.rewards, transaction.data);

    // TODO: race condition by user and code

    // valid promotion usage data
    const isUsable = await RuleServ.isUsableOne(promotion, transaction);
    if (!isUsable) {
        throw _.logicError('Cannot redeem promotion code', `Promotion code is not available`, 400, ERR.PROMOTION_CODE_IS_UNUSABLE)
    }

    // record the redemption
    await RuleServ.recordRedemption(promotion, transaction);

    const redemption: IRedemption = {
        promotion: promotion._id,
        code: promotion.code,
        transaction: transaction,
        rewarded: rewarded,
        created_at: new Date()
    }

    const result = await Redemption.insertOne(redemption);

    redemption._id = result.insertedId;

    return redemption;
}));

const updateRedemptionBody = _ajv({
    '@transactionId': 'string',
    '+@transactionData': {},
    '+@apiKey': 'string'
});
router.put('/redemptions/:redemption_id', _.validBody(updateRedemptionBody), AuthServ.authPromoApp(), _.routeAsync(async (req) => {
    const user = req.session.user;
    const redemptionId = _.mObjId(req.params.redemption_id);
    const time = moment.unix(req.body.datetime).unix() || _.nowInSeconds();

    const transaction: IPromoTransaction = {
        id: req.body.transactionId || _.uniqueId(),
        time: moment.unix(time).toDate(),
        data: req.body.transactionData
    }

    const redemption = await Redemption.findOne({ _id: redemptionId });
    if (_.isEmpty(redemption)) {
        throw _.logicError('Cannot update redemption', `Redemption ${redemptionId} not found`, 400, ERR.OBJECT_NOT_FOUND, redemptionId.toHexString());
    }

    const promotion = await Promotion.findOne<IPromotion>({ _id: redemption.promotion });
    if (_.isEmpty(promotion) || !promotion.user.equals(user._id)) {
        throw _.logicError('Cannot update redemption', `Permision denied`, 400, ERR.OBJECT_NOT_FOUND);
    }

    let isDataValid = await RuleServ.isValidTransactionData(promotion.rules, transaction.data);
    if (!isDataValid) {
        throw _.logicError('Cannot update redemption', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }

    isDataValid = await RewardServ.isValidTransactionData(promotion.rewards, transaction.data);
    if (!isDataValid) {
        throw _.logicError('Cannot update redemption', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }

    const rewarded = await RewardServ.applyPromotion(promotion.rewards, transaction.data);

    redemption.transaction = transaction;
    redemption.rewarded = rewarded;

    await Redemption.findOneAndUpdate({ _id: redemptionId }, {
        $set: {
            transaction: transaction,
            rewarded: rewarded
        }
    });

    return redemption;
}));

const updatePromotionStatusParams = _ajv({
    '+status': { enum: _.values(PROMOTION_STATUSES) }
})
router.put('/:id/status/:status', _.validParams(updatePromotionStatusParams), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const status: PROMOTION_STATUS = req.params.status;
    const promotionId = _.mObjId(req.params.id);

    const promotion = await Promotion.findOne({ _id: promotionId, user: req.session.user._id }, { fields: { status: 1 } });

    if (_.isEmpty(promotion)) {
        throw _.logicError('Cannot try promotion code', `Promotion not found`, 400, ERR.OBJECT_NOT_FOUND);
    }

    if (promotion.status != status) {
        await Promotion.updateOne({ _id: promotionId }, { $set: { status: status } });
    }

    return HC.SUCCESS;
}));

const queries = _ajv({
    '@limit': 'string',
    '@offset': 'string',
    '++': false
});
router.get('/', _.validQuery(queries), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const limit = _.parseIntNull(req.query.limit) || 50;
    const offset = _.parseIntNull(req.query.offset) || Number.MAX_SAFE_INTEGER;

    const promotions = await Promotion.find<IPromotion>({ status: PROMOTION_STATUSES.ENABLED }, { limit: limit, skip: offset }).toArray();
    return promotions;
}));

router.get('/campaign/:campaignId', _.validQuery(queries), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    let campaignId: ObjectID = _.mObjId(req.params.campaignId);
    const promotions = await Promotion.find({ campaign: campaignId }).toArray();
    return promotions;
}));

router.get('/:promotionIds/promotionIds', _.validQuery(queries), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const promotionIds: string[] = req.params.promotionIds.split(',');
    const listIdObj = promotionIds.map(id => _.mObjId(id));
    console.log(listIdObj);
    const promotions = await Promotion.find({ _id: { $in: listIdObj } }).toArray();
    return promotions;
}));

const addPromotionBody = _ajv({
    '+@code': 'string',
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
router.post('/', _.validBody(addPromotionBody), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const code: string = req.body.code;
    const codeUsed: IPromotion = await Promotion.findOne<IPromotion>({ code: code, user: req.session.user._id, status: PROMOTION_STATUSES.ENABLED });
    console.log(codeUsed);
    if (!_.isEmpty(codeUsed) && codeUsed.code == code) {
        throw _.logicError('Cannot create promotion', 'Code is duplicate', 400, ERR.PROMOTION_CODE_IS_DUPLICATE);
    }

    const rules: IRuleConfig[] = req.body.rules;
    const isValidRules = await RuleServ.isValidConfig(rules)
    if (!isValidRules) {
        throw _.logicError('Cannot create promotion', 'Invalid rules format', 400, ERR.INVALID_RULES_FORMAT);
    }

    const rewards: IRewardConfig[] = req.body.rewards;
    const isValidRewards = await RewardServ.isValidConfig(rewards);
    if (!isValidRewards) {
        throw _.logicError('Cannot create promotion', 'Invalid rewards format', 400, ERR.INVALID_REWARDS_FORMAT);
    }

    const startAt: number = req.body.start_at;
    const expiredAt: number = req.body.expired_at;
    const metadata = {};

    if (expiredAt < startAt) {
        throw _.logicError('Cannot create promotion', 'Invalid time', 400, ERR.DATA_MISMATCH);
    }

    const promotion: IPromotion = {
        user: req.session.user._id,
        code: code,
        rules: rules,
        rewards: rewards,
        metadata: metadata,
        created_at: _.nowInSeconds(),
        start_at: req.body.start_at,
        expired_at: req.body.expired_at,
        status: PROMOTION_STATUSES.ENABLED
    };
    const insertResult = await Promotion.insertOne(promotion);
    promotion._id = insertResult.insertedId;

    return {
        promotionId: promotion._id
    };
}));
export default router;