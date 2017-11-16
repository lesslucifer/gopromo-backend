import * as moment from 'moment';

import CONN from '../glob/conn';
import _ from '../utils/_';

import { IMongoModel, ObjectID } from './mongo-model';

export interface IRedemption extends IMongoModel {
    promotion: ObjectID;
    code: string;
    time: Date;
    transactionId: string;
    transactionData: any;
    rewardedData: any;
    promotionData: _.Dictionary<any>;
}

export default IRedemption;