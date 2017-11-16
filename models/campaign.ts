import * as moment from 'moment';

import CONN from '../glob/conn';
import _ from '../utils/_';

import { IMongoModel, ObjectID } from './mongo-model';

export interface IRuleConfig {
    type: string;
    data: any;
}

export interface IRewardConfig {
    type: string;
    data: any;
}

export interface ICampaign extends IMongoModel {
    user: ObjectID;
    name: string;
    charset: string;
    pattern: string;
    rules: IRuleConfig[];
    rewards: IRewardConfig[];
    metadata: any;
}