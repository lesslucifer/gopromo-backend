import * as moment from 'moment';

import CONN from '../glob/conn';
import _ from '../utils/_';

import { IMongoModel, ObjectID } from './mongo-model';

export interface IPromoApp extends IMongoModel {
    user: ObjectID;
    appName: string;
    apiKey: string;
}