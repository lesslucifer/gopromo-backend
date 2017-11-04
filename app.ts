import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as moment from 'moment';

import * as ENV from './glob/env';
import * as CONN from './glob/conn';
import HC from './glob/hc';
import _ from './utils/_';


import SessionServ from './serv/sess';
import { PromotionRules } from './serv/rules/index';

// Import routers
class Program {
    public static async main(): Promise<number> {
        ENV.configure(process.argv.length > 2 ? process.argv[2] : "");
        CONN.configureConnections();

        const test = new PromotionRules();
        const data = {
            userId: 13,
            abc: '12234'
        }
        const abc = await test.checkUsage({max_usage_per_user: data});

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
                'Content-Type, Accept, Authentication, Authorization, sess');

            if (req.method.toUpperCase() == 'OPTIONS') {
                res.statusCode = 204;
                res.send();
                return;
            }

            next();
        });

        // Configure routes

        // Start server
        server.listen(ENV.port, function () {
            console.log("Listen on port " + ENV.port + " ...");
        });

        return 0;
    }
}

Program.main();