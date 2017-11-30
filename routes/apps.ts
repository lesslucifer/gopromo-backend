import * as express from 'express';
import * as moment from 'moment';

import * as C from '../glob/cf';
import HC from '../glob/hc';
import ERR from '../glob/err';
import * as CONN from '../glob/conn';
import _ from '../utils/_';
import ajv2 from '../utils/ajv2';

// Import models here
import { Campaign, ICampaign, Promotion, IRuleConfig, IRewardConfig, PromoApp } from '../models';
import { AuthServ } from '../serv/auth';
import { IPromoApp } from '../models/promo_app';

// Import services here

const router = express.Router();
const _ajv = ajv2();

router.get('/', AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const user = req.session.user;

    const apps = await PromoApp.find({user: user._id}).toArray();
    return apps;
}));

const addAppBody = _ajv({
    '+@name': 'string|pattern=^[a-z0-9\\-\\_]+$|len<=32',
    '++': false
});
router.post('/', _.validBody(addAppBody), AuthServ.authRole('USER'), _.routeAsync(async (req) => {
    const name = req.body.name;
    const apiKey = _.randomstring.generate({length: 32});

    const app: IPromoApp = {
        user: req.session.user._id,
        appName: name,
        apiKey: apiKey
    };

    const result = await PromoApp.insert(app);
    app._id = result.insertedId;

    return app;
}));