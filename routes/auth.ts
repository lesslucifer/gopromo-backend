import * as express from 'express';
import * as moment from 'moment';

import * as C from '../glob/cf';
import HC from '../glob/hc';
import ERR from '../glob/err';
import * as CONN from '../glob/conn';
import _ from '../utils/_';
import ajv2 from '../utils/ajv2';

// Import models here
import { User, IUserInfo, IUser } from '../models';

// Import services here
import AuthServ from '../serv/auth';
import { UserServ } from '../serv/user';

const router = express.Router();
const _ajv = ajv2();

// Start API here
const loginBody = _ajv({
    '+email': {type: 'string', pattern: _.emailRegexStr},
    '+@password': 'string|>=6'
});
router.post('/login', _.routeAsync(async (req) => {
    const email: string = req.body.email.toLowerCase();
    const password: string = req.body.password;

   const user = await User.findOne<IUser>({email: email});

    if (_.isEmpty(user)) {
        throw _.logicError('Invalid user', `User ${email} does not exist`, 400, ERR.INVALID_USERNAME_OR_PASSWORD, email);
    }

    if (UserServ.getSHA1(user, password) != user.passwordSHA1) {
        throw _.logicError('Invalid password', 'Password input are incorrect', 400, ERR.INVALID_USERNAME_OR_PASSWORD);
    }

    return {
        user: UserServ.info(user),
        auth: await AuthServ.authKongToken(user, user.passwordSHA1)
    };
}));

const issueTokenBody = _ajv({
    '+@refresh_token': 'string',
    '+@userIdd': 'string',
    '++': false
})
router.post('/token', _.validBody(issueTokenBody), _.routeAsync(async (req) => {
    const userId = _.mObjId(req.body.userId);
    const user = await User.findOne({_id: userId});
    if (_.isEmpty(user)) {
        throw _.logicError('Cannot get token', `User not found`, 400, ERR.OBJECT_NOT_FOUND, userId.toHexString());
    }

    let token: any = null;
    try {
        token = await AuthServ.authKongTokenByRefreshToken(user, req.body.refresh_token);
    }
    catch (err) {
        throw _.logicError('Cannot get token', 'Refresh token are invalid', 400, ERR.DATA_MISMATCH, req.body.refresh_token);
    }

    return {
        user: UserServ.info(user),
        auth: token
    }
}));

const signUpBody = _ajv({
    '+@fullName': 'string',
    '+@email': 'string',
    '+phone': {type: 'string', pattern: '^\\d{9,11}$'},
    '+@password': 'string|len>=6',
    '@company': 'string',
    '@companySize': 'integer|>=0',
    '++': false
});
router.post('/signup', _.validBody(signUpBody), _.routeAsync(async (req) => {
    const fullName: string = req.body.fullName;
    const email: string = req.body.email;
    const phone: string = req.body.phoneNumber;    
    const password: string = req.body.password;
    const company: string = req.body.company || '';
    const companySize: number = req.body.companySize || 0;

    const oldUser = await User.findOne({email: email}, {fields: {_id: 1}});

    if (!_.isEmpty(oldUser)) {
        throw _.logicError('Cannot signup', `Login name ${email} is already registered`,
        409, ERR.OBJECT_IS_ALREADY_EXIST, email);
    }

    const newUser: IUser = <IUser> {
        fullName: fullName,
        phone: phone,
        email: email,
        roles: ['USER'],
        company: company,
        companySize: companySize
    };

    UserServ.setPassword(newUser, password);

    await AuthServ.registerAuth(newUser);
    const result = await User.insertOne(newUser);

    return {_id: result.insertedId};
}));

export default router;