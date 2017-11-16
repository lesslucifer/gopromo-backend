import * as express from 'express';
import * as request from 'request-promise';

import _ from '../utils/_';
import ERR from '../glob/err';
import ENV from '../glob/env';

import UserServ from './user';
import { IUser } from '../models';

export interface IAuthServConfig {
    UsernameField: string;
}

interface IOAuth2Credentials {
    client_id: string;
    client_secret: string;
}

export class AuthServ {
    static CONFIG = <IAuthServConfig> {
        UsernameField: 'X-Consumer-Username'
    };

    static authRole(...roles: string[]) {
        return _.routeNextableAsync(async (req, resp, next) => {
            const username = req.header(this.CONFIG.UsernameField);
            if (_.isEmpty(username)) {
                throw _.logicError('Permission denied', 'Invalid user', 403, ERR.UNAUTHORIZED, username);
            }

            const user = await UserServ.getUserByAuthID(username);
            if (_.isEmpty(user)) {
                throw _.logicError('Permission denied', 'Invalid role', 403, ERR.INVALID_ROLE);
            }

            const isHasRole = AuthServ.checkRole(user.roles, roles);
            if (!isHasRole) {
                throw _.logicError('Permission denied', 'Invalid role', 403, ERR.INVALID_ROLE);
            }

            req.session.user = user;
            next();
        });
    }
    
    static checkRole(roles: string[], required: string[]) {
        for (const r of required) {
            if (roles.indexOf(r) >= 0) {
                return true;
            }
        }

        return false;
    }
    
    static async authKongToken(user: IUser, pass: string) {
        const url = `${ENV.KONG.MY_HOST}/oauth2/token`;
        const body = {
            grant_type: 'password',
            client_id: user.auth.kongClientID,
            client_secret: user.auth.kongClientSecrect,
            scope: 'go-promo',
            provision_key: ENV.KONG.PROVISION,
            authenticated_userid: user.auth.kongID,
            username: user.auth.authID,
            password: pass
        }

        const data = await request({
            url,
            form: body,
            method: 'POST',
            json: true
        });

        return data;
    }
    
    static async registerAuth(user: IUser) {
        user.auth = <any> {};
        user.auth.authID = `STR@${_.randomstring.generate({length: 16})}`;

        const kongId = await this.createKongConsumer(user.auth.authID);
        user.auth.kongID = kongId;

        let oauth2 = await this.createOAuth2Credentials(user.auth.authID, kongId);
        if (_.isEmpty(oauth2.client_id) || _.isEmpty(oauth2.client_secret)){
            oauth2 = await this.getOAuth2Credentials(kongId);
        }
        
        user.auth.kongClientID = oauth2.client_id;
        user.auth.kongClientSecrect = oauth2.client_secret;

        return user;
    }


    private static async createKongConsumer(username: string) {
        const opts = {
            url: `${ENV.KONG.ADMIN_HOST}/consumers`,
            method: 'POST',
            form: {
                username: username
            },
            json: true
        };

        try {
            const data = await request(opts);
            return <string> data.id || null;
        }
        catch (ex) {
            const consumer = await this.getKongConsumer(username);
            return consumer.id;
        }
    }

    private static async getKongConsumer(username: string) {
        const opts = {
            url: `${ENV.KONG.ADMIN_HOST}/consumers/${username}`,
            method: 'GET',
            json: true
        };

        return await request(opts);
    }

    private static async getOAuth2Credentials(kongId: string) {
        const opts = {
            url: `${ENV.KONG.ADMIN_HOST}/consumers/${kongId}/oauth2`,
            method: 'GET',
            json: true
        };

        const body = await request(opts);
        return <IOAuth2Credentials> {
            client_id: body.client_id,
            client_secret: body.client_secret
        };
    }

    private static async createOAuth2Credentials(username: string, kongId: string) {
        const opts = {
            url: `${ENV.KONG.ADMIN_HOST}/consumers/${username}/oauth2`,
            method: 'POST',
            form: {
                name: username,
                redirect_uri: ENV.KONG.REDIRECT_HOST
            },
            json: true
        };


        const body = await request(opts);
        return <IOAuth2Credentials> {
            client_id: body.client_id,
            client_secret: body.client_secret
        };
    }

    static async authKongTokenByRefreshToken(user: IUser, token: string) {
        const url = `${ENV.KONG.MY_HOST}/oauth2/token`;
        const body = {
            grant_type: 'refresh_token',
            client_id: user.auth.kongClientID,
            client_secret: user.auth.kongClientSecrect,
            refresh_token: token
        }

        const data = await request({
            url,
            form: body,
            method: 'POST',
            json: true
        });

        return data;
    }
}

export default AuthServ;