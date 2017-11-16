import * as moment from 'moment';

import CONN from '../glob/conn';
import _ from '../utils/_';

import { IMongoModel, ObjectID } from './mongo-model';
import { IRuleConfig, IRewardConfig } from './campaign';

export interface IPromoTransaction {
    id: string;
    time: Date;
    data: any;
}

export interface IPromotion extends IMongoModel {
    campaign: ObjectID;
    user: ObjectID;
    code: string;
    pattern: string;
    rules: IRuleConfig[];
    rewards: IRewardConfig[];
    metadata: any;
}

export default IPromotion;