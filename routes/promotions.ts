import * as express from 'express';
import * as moment from 'moment';

import * as C from '../glob/cf';
import HC from '../glob/hc';
import ERR from '../glob/err';
import * as CONN from '../glob/conn';
import _ from '../utils/_';
import ajv2 from '../utils/ajv2';

// Import models here
import { Campaign, ICampaign, Promotion, IPromotion, IPromoTransaction, IRedemption, Redemption, PROMOTION_STATUSES, PROMOTION_STATUS } from '../models';

// Import services here
import AuthServ from '../serv/auth';
import RuleServ from '../serv/rules';
import RewardServ from '../serv/rewards';
import { PromotionServ } from '../serv/promotion';
import { ObjectID } from 'bson';

const router = express.Router();
const _ajv = ajv2();

// Start API here
const tryPromotionBody = _ajv({
    '@transactionId': 'string',
    '+@transactionData': {},
    '+@apiKey': 'string'
});
router.post('/:code/tries', _.validBody(tryPromotionBody), AuthServ.authPromoApp(), _.routeAsync(async (req) => {
    const user = req.session.user;
    const code = req.params.code;
    const time = moment.unix(req.body.datetime).unix() || _.nowInSeconds();

    const promotion = await Promotion.findOne<IPromotion>({user: user._id, code: code});
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
    
    const transaction: IPromoTransaction = {
        id: req.body.transactionId,
        time: moment.unix(time).toDate(),
        data: req.body.transactionData
    }

    let isDataValid = await RuleServ.isValidTransactionData(promotion.rules, transaction.data);
    if (!isDataValid) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }

    isDataValid = await RewardServ.isValidTransactionData(promotion.rewards, transaction.data);
    if (!isDataValid) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }

    // valid promotion usage data
    const isUsable = await RuleServ.isUsable(promotion, transaction);
    if (!isUsable) {
        throw _.logicError('Cannot try promotion code', `Promotion code is not available`, 400, ERR.PROMOTION_CODE_IS_UNUSABLE)
    }

    // apply promotion
    const rewarded = await RewardServ.applyPromotion(promotion.rewards, transaction.data);
    return {
        promotion: promotion,
        transaction: transaction,
        rewarded: rewarded
    }
}));


const redeemPromotionBody = _ajv({
    '@transactionId': 'string',
    '+@transactionData': {},
    '+@apiKey': 'string'
});
router.post('/:code/redemptions', _.validBody(tryPromotionBody), AuthServ.authPromoApp(), _.routeAsync(async (req) => {
    const user = req.session.user;
    const code = req.params.code;
    const time = moment.unix(req.body.datetime).unix() || _.nowInSeconds();


    const transaction: IPromoTransaction = {
        id: req.body.transactionId,
        time: moment.unix(time).toDate(),
        data: req.body.transactionData
    }

    const promotion = await Promotion.findOne<IPromotion>({user: user._id, code: code});
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
    const isUsable = await RuleServ.isUsable(promotion, transaction);
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

const updatePromotionStatusParams = _ajv({
    '+status': {enum: _.values(PROMOTION_STATUSES)}
})
router.put('/:id/status/:status', _.validParams(updatePromotionStatusParams), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const status: PROMOTION_STATUS = req.params.status;
    const promotionId = _.mObjId(req.params.id);

    const promotion = await Promotion.findOne({_id: promotionId, user: req.session.user._id}, {fields: {status: 1}});
    
    if (_.isEmpty(promotion)) {
        throw _.logicError('Cannot try promotion code', `Promotion not found`, 400, ERR.OBJECT_NOT_FOUND);
    }

    if (promotion.status != status) {
        await Promotion.updateOne({_id: promotionId}, {$set: {status: status}});
    }

    return HC.SUCCESS;
}));

const queries = _ajv({
    '@campaign_id': 'string',
    '++': false
});
router.get('/', _.validQuery(queries), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    let campaginId: ObjectID;
    try {
        campaginId = _.mObjId(req.query.campaign_id);
    } catch (err) {

    }
    const promotions = await Promotion.find({ campaign: campaginId }).toArray();
    return promotions;
}));

router.get('/:promotionId', _.validQuery(queries), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    let promotionId: ObjectID;
    try {
        promotionId = _.mObjId(req.params.promotionId);
    } catch (err) {

    }
    const promotion = await Promotion.findOne({ _id: promotionId });
    return promotion;
}));

export default router;