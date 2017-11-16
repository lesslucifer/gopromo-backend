import _ from '../utils/_';

import { ICampaign, IPromotion, Promotion, Campaign } from "../models";

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
            metadata: campaign.metadata
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
}