import * as mongodb from 'mongodb';

export * from './campaign';
export * from './promotion';

export let Campaign: mongodb.Collection;
export let Promotion: mongodb.Collection;

export function init(db: mongodb.Db) {
    Campaign = db.collection('campaign');
    Promotion = db.collection('promotion');

    initIndexes();
}

function initIndexes() {
    
}