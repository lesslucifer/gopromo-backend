import * as express from 'express';
import * as moment from 'moment';

import * as C from '../glob/cf';
import HC from '../glob/hc';
import ERR from '../glob/err';
import * as CONN from '../glob/conn';
import _ from '../utils/_';
import ajv2 from '../utils/ajv2';

// Import models here
import { Campaign, ICampaign, Promotion, IPromotion, IPromoTransaction, IRedemption, Redemption } from '../models';

// Import services here
import AuthServ from '../serv/auth';
import RuleServ from '../serv/rules';
import RewardServ from '../serv/rewards';
import { PromotionServ } from '../serv/promotion';

const router = express.Router();
const _ajv = ajv2();

// Start API here
const tryPromotionBody = _ajv({
    '@transactionId': 'string',
    '+@transactionData': {}
});
router.post('/:code/tries', _.validBody(tryPromotionBody), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const user = req.session.user;
    const code = req.params.code;
    const userTime = moment(req.body.datetime);
    const time = userTime.isValid() ? userTime : moment();

    const transaction: IPromoTransaction = {
        id: req.body.transactionId,
        time: time.toDate(),
        data: req.body.transactionData
    }

    const promotion = await Promotion.findOne<IPromotion>({user: user._id, code: code});
    if (_.isEmpty(promotion)) {
        throw _.logicError('Cannot try promotion code', `Promotion ${code} not found`, 400, ERR.OBJECT_NOT_FOUND, code);
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
    '+@transactionData': {}
});
router.post('/:code/redemptions', _.validBody(tryPromotionBody), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const user = req.session.user;
    const code = req.params.code;
    
    const userTime = moment(req.body.datetime);
    const time = userTime.isValid() ? userTime : moment();


    const transaction: IPromoTransaction = {
        id: req.body.transactionId,
        time: time.toDate(),
        data: req.body.transactionData
    }

    const promotion = await Promotion.findOne<IPromotion>({user: user._id, code: code});
    if (_.isEmpty(promotion)) {
        throw _.logicError('Cannot try promotion code', `Promotion ${code} not found`, 400, ERR.OBJECT_NOT_FOUND, code);
    }

    let isDataValid = await RuleServ.isValidTransactionData(promotion.rules, transaction.data);
    if (!isDataValid) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }
    
    isDataValid = await RewardServ.isValidTransactionData(promotion.rewards, transaction.data);
    if (!isDataValid) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }
    
    const rewarded = await RewardServ.applyPromotion(promotion.rewards, transaction.data);

    // TODO: race condition by user and code

    // valid promotion usage data
    const isUsable = await RuleServ.isUsable(promotion, transaction);
    if (!isUsable) {
        throw _.logicError('Cannot try promotion code', `Promotion code is not available`, 400, ERR.PROMOTION_CODE_IS_UNUSABLE)
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

export default router;