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
    '@custom_id': 'string',
    '+@data': {}
});
router.post(':code/tries', _.validBody(tryPromotionBody), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const user = req.session.user;
    const code = req.params.code;
    const customId: string = req.body.custom_id;
    const userTime = moment(req.body.datetime);
    const time = userTime.isValid() ? userTime : moment();

    const data: any = req.body.data;

    const promotion = await Promotion.findOne<IPromotion>({user: user._id, code: code});
    if (_.isEmpty(promotion)) {
        throw _.logicError('Cannot try promotion code', `Promotion ${code} not found`, 400, ERR.OBJECT_NOT_FOUND, code);
    }

    if (!RuleServ.isValidData(promotion.rules, data)) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }
    
    if (!RewardServ.isValidData(promotion.rewards, data)) {
        throw _.logicError('Cannot try promotion code', `Transaction data mismatch`, 400, ERR.TRANSACTION_DATA_MISMATCH);
    }
    
    // valid promotion usage data

    // apply promotion

    return true;
}));

export default router;