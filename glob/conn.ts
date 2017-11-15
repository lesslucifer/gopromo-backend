import * as redis from 'redis';
import * as mongodb from 'mongodb';

import _ from '../utils/_';
import * as ConnRedis from '../utils/redis-promisified';

import { ENV_DB_CONFIG } from './env'

// ************ CONFIGS ************

export class AppConnections {
    private redis: ConnRedis.IConnRedis;
    private mongo: mongodb.Db;

    get REDIS() { return this.redis }
    get MONGO() { return this.mongo }

    constructor() {

    }

    async configureConnections(dbConfig: ENV_DB_CONFIG) {
        const redisConn: redis.RedisClient = redis.createClient(dbConfig.REDIS);
        this.redis = ConnRedis.createConnRedis(redisConn);

        this.mongo = await mongodb.connect(dbConfig.MONGO.CONNECTION_STRING, dbConfig.MONGO.OPTIONS);
    }
}

const CONN = new AppConnections();
export default CONN;

