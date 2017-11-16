import * as mongodb from 'mongodb';

export * from './campaign';
export * from './promotion';
export * from './user';

export let Campaign: mongodb.Collection;
export let Promotion: mongodb.Collection;
export let User: mongodb.Collection;

export function init(db: mongodb.Db) {
    Campaign = db.collection('campaign');
    Promotion = db.collection('promotion');
    User = db.collection('user');

    initIndexes();
}

async function initIndexes() {
    await Promotion.createIndex({code: 'hashed'});
    await Promotion.createIndex({user: 1, code: 1}, {unique: true});
    await Promotion.createIndex({user: 1, pattern: 1});
}