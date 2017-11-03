import * as express from 'express';

import _ from '../utils/_';
import ERR from '../glob/err';

export interface IAuthUserModel {
    getUser(uid: any): Promise<any>;
    isHasRole(uid: any, role: any): Promise<boolean>;
}

export interface IAuthServConfig {
    UsernameField: string;
}

export class AuthServ {
    static CONFIG = <IAuthServConfig> {
        UsernameField: 'X-Consumer-Username'
    };

    static MODEL: IAuthUserModel

    static authRole(role: any) {
        return _.routeNextableAsync(async (req, resp, next) => {
            const username = req.header(this.CONFIG.UsernameField);
            if (_.isEmpty(username)) {
                throw _.logicError('Permission denied', 'Invalid user', 403, ERR.UNAUTHORIZED, username);
            }

            const user = await this.MODEL.getUser(username);
            if (_.isEmpty(user)) {
                throw _.logicError('Permission denied', 'Invalid role', 403, ERR.INVALID_ROLE);
            }

            const isHasRole = await this.MODEL.isHasRole(username, role);
            if (!isHasRole) {
                throw _.logicError('Permission denied', 'Invalid role', 403, ERR.INVALID_ROLE);
            }

            req.session.user = user;
            next();
        });
    }
}

export default AuthServ;