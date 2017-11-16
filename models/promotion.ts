import * as moment from 'moment';

import CONN from '../glob/conn';
import _ from '../utils/_';

import { IMongoModel, ObjectID } from './mongo-model';

export interface IPromotion extends IMongoModel {
    campaign: ObjectID;
    user: ObjectID;
    code: string;
    pattern: string;
    rules: any;
    rewards: any;
    metadata: any;
}

export default IPromotion;