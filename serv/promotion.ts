import _ from '../utils/_';

import { ICampaign, IPromotion, Promotion, Campaign, ObjectID, IPromotionData, PromotionData, PROMOTION_STATUS, PROMOTION_STATUSES } from "../models";

export class PromotionServ {
    static async generatePromotions(campaign: ICampaign, nPromotion: number) {
        if (!this.isFeasiblePattern(campaign.pattern, campaign.charset, nPromotion)) {
            throw Error('Not enough space for generate promotion code');
        }

        const existedCodes = (await Promotion.find<IPromotion>({user: campaign.user, pattern: campaign.pattern},
        {fields: {code: 1}}).toArray()).map(c => c.code);

        const codes = this.genUniqueCodes(nPromotion, campaign.pattern, campaign.charset, existedCodes);
        const promotions: IPromotion[] = codes.map((code) => ({
            campaign: campaign._id,
            user: campaign.user,
            code: code,
            pattern: campaign.pattern,
            rules: campaign.rules,
            rewards: campaign.rewards,
            metadata: campaign.metadata,
            created_at: _.nowInSeconds(),
            start_at: campaign.start_at,
            expired_at: campaign.expired_at,
            status: PROMOTION_STATUSES.ENABLED
        }));

        return await Promotion.insertMany(promotions);
    }

    private static genUniqueCodes(nCode: number, pattern: string, charset: string, existedCodes: string[]) {
        const unavail = _.zipToObj(existedCodes, c => true)
        const codes: _.Dictionary<boolean> = {};
        while (nCode > 0) {
            const code = this.genCode(pattern, charset);
            if (codes[code] === undefined && unavail[code] === undefined) {
                codes[code] = true;
                --nCode;
            }
        }

        return _.keys(codes);
    }

    private static genCode(pattern: string, charset: string): string {
        return pattern.split('').map(c => {
            if (c == '#') {
                return charset[_.random(0, charset.length)]
            }

            return c;
        }).join('');
    }
    
    static isFeasiblePattern(pattern: string, charset: string, count: number, acceptableProb: number = 0.01) {
        const nOfRandChar = pattern.split('').filter(c => c == '#').length;
        const nAvailCode = Math.pow(charset.length, nOfRandChar);
        return acceptableProb * nAvailCode >= count;
    }

    static hashStr(s: string) {
        let hash = 0, i, chr;
        if (s.length === 0) return hash;
        for (i = 0; i < s.length; i++) {
            chr   = s.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }

        return hash;
    }

    static genIdHash(id: string, limit: number = 50000): number {
        const n = _.parseIntNull(id);
        if (n != null) {
            return n / limit;
        }

        return this.hashStr(id) / limit;
    }

    static genDataToken(id: string): string {
        return _.sha1(id);
    }

    static async updatePromotionData(promotionId: string, token: string, update: any) {
        const upsertData = _.merge({}, update, {
            $setOnInsert: {
                promotion: _.mObjId(promotionId), 
                token: token
            }
        });
        return await PromotionData.findOneAndUpdate({token: token}, upsertData, {upsert: true, returnOriginal: false});
    }
}