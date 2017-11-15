import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as moment from 'moment';

import { ENV_CONFIG } from './glob/env';
import CONN from './glob/conn';
import HC from './glob/hc';
import _ from './utils/_';

import SessionServ from './serv/sess';

// Import routers

class Program {
    public static main(): number {
        const envConfig: ENV_CONFIG = require(process.env.config || './env.json');
        CONN.configureConnections(envConfig.DB);

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
        server.listen(envConfig.HTTP_PORT, function () {
            console.log("Listen on port " + envConfig.HTTP_PORT + " ...");
        });

        return 0;
    }
}

Program.main();