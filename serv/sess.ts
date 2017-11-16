import * as express from 'express';

import { IUserInfo } from '../models';

interface IReqSession {
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