import * as mongodb from 'mongodb';
import { ICampaign } from './campaign';
import { IPromotion } from './promotion';
import { IUser } from './user';
import { IPromotionData } from './promotion_data';
import { IRedemption } from './redemption';
import { IPromoApp } from './promo_app';

export * from './mongo-model';
export * from './campaign';
export * from './promotion';
export * from './user';
export * from './promotion_data';
export * from './redemption';

export let Campaign: mongodb.Collection<ICampaign>;
export let Promotion: mongodb.Collection<IPromotion>;
export let User: mongodb.Collection<IUser>;
export let PromotionData: mongodb.Collection<IPromotionData>;
export let Redemption: mongodb.Collection<IRedemption>;
export let PromoApp: mongodb.Collection<IPromoApp>;

export function init(db: mongodb.Db) {
    Campaign = db.collection('campaign');
    Promotion = db.collection('promotion');
    User = db.collection('user');
    PromotionData = db.collection('promotion_data');
    Redemption = db.collection('redemption');
    PromoApp = db.collection('app');

    initIndexes();
}

async function initIndexes() {
    await Promotion.createIndex({ code: 'hashed' });
    await Promotion.createIndex({ user: 1, code: 1 }, { unique: true });
    await Promotion.createIndex({ user: 1, pattern: 1 });

    await PromotionData.createIndex({ promotion: 1 });
    await PromotionData.createIndex({ token: 'hashed' });

    await Redemption.createIndex({ promotion: 1, time: -1 });


    await PromoApp.createIndex({ user: 1, appName: 1 });
    await PromoApp.createIndex({ apiKey: 1 }, { unique: true });
}