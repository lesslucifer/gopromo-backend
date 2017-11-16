import * as mongodb from 'mongodb';

export * from './mongo-model';
export * from './campaign';
export * from './promotion';
export * from './user';
export * from './promotion_data';
export * from './redemption';

export let Campaign: mongodb.Collection;
export let Promotion: mongodb.Collection;
export let User: mongodb.Collection;
export let PromotionData: mongodb.Collection;
export let Redemption: mongodb.Collection;

export function init(db: mongodb.Db) {
    Campaign = db.collection('campaign');
    Promotion = db.collection('promotion');
    User = db.collection('user');
    PromotionData = db.collection('promotion_data');
    Redemption = db.collection('redemption');

    initIndexes();
}

async function initIndexes() {
    await Promotion.createIndex({code: 'hashed'});
    await Promotion.createIndex({user: 1, code: 1}, {unique: true});
    await Promotion.createIndex({user: 1, pattern: 1});

    await PromotionData.createIndex({promotion: 1}, {unique: true});

    await Redemption.createIndex({promotion: 1, time: -1});
    await Redemption.createIndex({token: 'hashed'});
}