import * as moment from 'moment';

import CONN from '../glob/conn';
import _ from '../utils/_';

import { IMongoModel, ObjectID } from './mongo-model';

export interface IPromotionData extends IMongoModel {
    promotion: ObjectID;
    token: string;
    data: _.Dictionary<any>;
}

export default IPromotionData;