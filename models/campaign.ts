import * as moment from 'moment';

import CONN from '../glob/conn';
import _ from '../utils/_';

import { IMongoModel } from './mongo-model';

export interface ICampaign extends IMongoModel {
    name: string;
    charset: string;
    pattern: string;
    rules: any;
    rewards: any;
    metadata: any;
}