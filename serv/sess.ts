import * as express from 'express';

import { IUserInfo } from '../models';
import { IPromoApp } from '../models/promo_app';

interface IReqSession {
    promoApp?: IPromoApp;
    user?: IUserInfo
}

declare module "express-serve-static-core" {
    interface Request {
        session: IReqSession
    }
}

export default function createSesssionObject(): express.RequestHandler {
    return (req, resp, next) => {
        req.session = {};
        next();
    };
}