import * as mongodb from 'mongodb';

import _ from '../utils/_';
import { ObjectID } from 'bson';

export interface IMongoModel {
    _id?: mongodb.ObjectID;
    __v?: number;
}

export { ObjectID } from 'mongodb';