import * as moment from 'moment';

import CONN from '../glob/conn';
import _ from '../utils/_';

import { IMongoModel, ObjectID } from './mongo-model';
import { IPromoTransaction } from './index';

export interface IRedemption extends IMongoModel {
    promotion: ObjectID;
    code: string;
    transaction: IPromoTransaction;
    rewarded: any;
    created_at: Date;
}

export default IRedemption;