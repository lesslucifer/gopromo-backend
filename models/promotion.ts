import * as moment from 'moment';

import CONN from '../glob/conn';
import _ from '../utils/_';

import { IMongoModel, ObjectID } from './mongo-model';
import { IRuleConfig, IRewardConfig } from './campaign';
import { Dictionary } from 'lodash';

export interface IPromoTransaction {
    id: string;
    time: Date;
    data: any;
}

export type PROMOTION_STATUS = 'ENABLED' | 'DISABLED';
export const PROMOTION_STATUSES = {
    ENABLED: <PROMOTION_STATUS> 'ENABLED',
    DISABLED: <PROMOTION_STATUS> 'DISABLED'
}

export interface IPromotion extends IMongoModel {
    campaign: ObjectID;
    user: ObjectID;
    code: string;
    pattern: string;
    rules: IRuleConfig[];
    rewards: IRewardConfig[];
    metadata: any;
    created_at: number;
    start_at: number;
    expired_at: number;
    status: PROMOTION_STATUS;
}

export default IPromotion;