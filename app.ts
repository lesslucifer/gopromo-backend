import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as moment from 'moment';

import { ENV } from './glob/env';
import CONN from './glob/conn';
import HC from './glob/hc';
import _ from './utils/_';

import * as MODELS from './models';

import SessionServ from './serv/sess';

// Import routers
import CampaignRoute from './routes/campaigns';
import PromotionRoute from './routes/promotions';
import AuthRoute from './routes/auth';
import PromoAppRoute from './routes/apps';

class Program {
    public static async main(): Promise<number> {
        await CONN.configureConnections(ENV.DB);

        MODELS.init(CONN.MONGO);

        // start cronjob

        const server = express();
        server.use(bodyParser.json());

        // create session object
        server.use(SessionServ());

        // CORS
        server.all('*', function (req, res, next) {
            res.header('Access-Control-Allow-Origin', "*");
            res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT, DELETE');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400');
            res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, ' +
                'Content-Type, Accept, Authentication, Authorization, X-Consumer-Username, sess');

            if (req.method.toUpperCase() == 'OPTIONS') {
                res.statusCode = 204;
                res.send();
                return;
            }

            next();
        });

        // Configure routes
        server.use('/auth', AuthRoute);
        server.use('/campaigns', CampaignRoute);
        server.use('/promotions', PromotionRoute);
        server.use('/apps', PromoAppRoute);

        // Start server
        server.listen(ENV.HTTP_PORT, function () {
            console.log("Listen on port " + ENV.HTTP_PORT + " ...");
        });

        return 0;
    }
}

Program.main();