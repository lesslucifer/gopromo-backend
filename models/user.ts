import * as moment from 'moment';

import CONN from '../glob/conn';
import _ from '../utils/_';

import { IMongoModel, ObjectID } from './mongo-model';

export interface IUserInfo extends IMongoModel {
    fullName: string;

    email: string;
    phone: string;

    company: string;
    companySize: number;

    roles: string[]
}

export interface IUser extends IUserInfo {
    passwordSalt?: string;
    passwordSHA1?: string;

    // auth
    auth?: {
        authID: string;
        kongID: string;
        kongClientID: string;
        kongClientSecrect: string;
    };
}