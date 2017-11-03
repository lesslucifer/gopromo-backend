import * as moment from 'moment';

import { IMysqlQuery } from '../utils/mysql-promisified';

import * as CONN from '../glob/conn';
import _ from '../utils/_';

export interface IModel {
    address: string;
    longitude: number;
    latitude: number;
}

export class Model {
}

export default Model;