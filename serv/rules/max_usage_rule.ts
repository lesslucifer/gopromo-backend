import * as moment from 'moment';
import _ from '../../utils/_';
import { IPromotionRule, IRedemptionContext, IRedemptionBatchContext } from './index'
import { ajv2 } from '../../utils/ajv2';
import { IPromotion, IPromotionData, Promotion, PromotionData, IPromoTransaction } from '../../models/index';
import { PromotionServ } from '../promotion';
import { HC } from '../../glob/hc';

const _ajv = ajv2();

export class MaxUsageRule implements IPromotionRule {
    key() {
        return 'max_usage';
    }

    genToken(ctx: IRedemptionContext) {
        return PromotionServ.genDataToken(`${ctx.promotionId}`);
    }

    get dataKey() {
        return `data.${this.key()}.n_use`;
    }

    async isValidConfig(data: any): Promise<boolean> {
        const val = _.parseIntNull(data);
        if (val == null) {
            return false;
        }

        return 0 < val;
    }
    
    async isValidTransactionData(transactionData: any): Promise<boolean> {
        return true;
    }
    
    async recordRedemption(ctx: IRedemptionContext) {
        const token = this.genToken(ctx);
        const dataKey = this.dataKey;

        await PromotionServ.updatePromotionData(ctx.promotionId, token, {$inc: {[dataKey]: 1}});
    }

    async isUsable(ctx: IRedemptionBatchContext): Promise<{[trId: string]: boolean}> {
        const tokens = ctx.transactions.map((tr, i) => ({
            token: this.genToken(PromotionServ.getSingleCtx(ctx, i)),
            transaction: tr
        }));
        
        const promoDataArr = await PromotionData.find({token: _.uniq(tokens.map(tk => tk.token))}, {fields: {[this.dataKey]: 1}}).toArray();
        const promoData = _.keyBy(promoDataArr, d => d.token);

        const maxUse: number = ctx.config.data;
        const result = _.arrToObj(tokens, tk => tk.transaction.id, (tk, i) => {
            const data = promoData[tk.token];
            return (_.get(data, this.dataKey) || 0) + i < maxUse;
        });

        return result;
    }
}