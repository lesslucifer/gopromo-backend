import * as express from 'express';
import * as ajv from 'ajv';
import * as moment from 'moment';

import * as C from '../glob/cf';
import HC from '../glob/hc';
import ERR from '../glob/err';
import * as CONN from '../glob/conn';
import _ from '../utils/_';

// Import models here

// Import services here
import AuthServ from '../serv/auth';

const router = express.Router();
const _ajv = ajv();

// Start API here
let bodyValidator = _ajv.compile({
    type: 'object',
    properties: {
    },
    required: []
});
router.post('/', _.validBody(bodyValidator), _.routeAsync(async (req) => {
}));

export default router;