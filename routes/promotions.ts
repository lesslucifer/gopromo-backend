import * as express from 'express';
import * as moment from 'moment';

import * as C from '../glob/cf';
import HC from '../glob/hc';
import ERR from '../glob/err';
import * as CONN from '../glob/conn';
import _ from '../utils/_';
import ajv2 from '../utils/ajv2';

// Import models here
import { Campaign, ICampaign, Promotion, IPromotion } from '../models';

// Import services here
import AuthServ from '../serv/auth';
import RuleServ from '../serv/rules';
import RewardServ from '../serv/rewards';
import { PromotionServ } from '../serv/promotion';

const router = express.Router();
const _ajv = ajv2();

// Start API here
const tryPromotionBody = _ajv({
    '@transactionDd': 'string',
    '+@transactionData': {}
});
router.post('/:code/tries', _.validBody(tryPromotionBody), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const user = req.session.user;
    const code = req.params.code;
    const transactionId: string = req.body.transactionId;
    const userTime = moment(req.body.datetime);
    const time = userTime.isValid() ? userTime : moment();

    const transactionData: any = req.body.transactionData;

    const promotion = await Promotion.findOne<IPromotion>({user: user._id, code: code});
    if (_.isEmpty(promotion)) {
        throw _.logicError('Cannot try promotion code', `Promotion ${code} not found`, 400, ERR.OBJECT_NOT_FOUND, code);
    }

    let isDataValid = await RuleServ.isValidData(promotion.rules, transactionData);
    if (!isDataValid) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }
    
    isDataValid = await RewardServ.isValidData(promotion.rewards, transactionData);
    if (!isDataValid) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }
    
    // valid promotion usage data

    // apply promotion
    const rewarded = await RewardServ.applyPromotion(promotion.rewards, transactionData);
    return {
        transaction_id: transactionId,
        code: code,
        time: time,
        data: transactionData,
        rewarded: rewarded
    }
}));


const redeemPromotionBody = _ajv({
    '@transaction_id': 'string',
    '+@data': {}
});
router.post('/:code/redemptions', _.validBody(tryPromotionBody), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const user = req.session.user;
    const code = req.params.code;
    
    const transactionId: string = req.body.transaction_id;
    const userTime = moment(req.body.datetime);
    const time = userTime.isValid() ? userTime : moment();

    const transactionData: any = req.body.transactionData;

    const promotion = await Promotion.findOne<IPromotion>({user: user._id, code: code});
    if (_.isEmpty(promotion)) {
        throw _.logicError('Cannot try promotion code', `Promotion ${code} not found`, 400, ERR.OBJECT_NOT_FOUND, code);
    }

    let isDataValid = await RuleServ.isValidData(promotion.rules, transactionData);
    if (!isDataValid) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }
    
    isDataValid = await RewardServ.isValidData(promotion.rewards, transactionData);
    if (!isDataValid) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }
    
    const rewarded = await RewardServ.applyPromotion(promotion.rewards, transactionData);

    // race condition by user and code

    // valid promotion usage data

    // record the redemption
    await RuleServ.recordRedemption(promotion, transactionData);

    // do redeem
    return {
        transaction_id: transactionId,
        code: code,
        time: time,
        data: transactionData,
        rewarded: rewarded
    }
}));

export default router;