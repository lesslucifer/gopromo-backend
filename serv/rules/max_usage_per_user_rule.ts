import * as moment from 'moment';
import _ from '../../utils/_';
import ajv2 from '../../utils/ajv2';
import { IPromotionRule, IRedemptionContext, IRedemptionBatchContext } from './index';
import { IPromotion, IPromotionData, PromotionData, IPromoTransaction } from '../../models/index';
import { PromotionServ } from '../promotion';

const _ajv = ajv2();
const dataValidator = _ajv({
    '+@user': {
        '+@id': 'string'
    }
});

interface ITransactionData {
    user: {
        id: string;
    }
}

export class MaxUsagePerUserRule implements IPromotionRule {
    key() {
        return 'max_usage_per_user';
    }

    genToken(ctx: IRedemptionContext) {
        const userIdHash = PromotionServ.genIdHash(ctx.transaction.data.user.id);
        const token = PromotionServ.genDataToken(`${ctx.promotionId}_${userIdHash}`);
        return token;
    }

    dataKey(tr: IPromoTransaction) {
        return `data.${this.key()}.${tr.data.user.id}.n_use`;
    }

    async isValidConfig(data: any): Promise<boolean> {
        const val = _.parseIntNull(data);
        if (val == null) {
            return false;
        }

        return 0 < val;
    }
    
    async isValidTransactionData(transactionData: any): Promise<boolean> {
        return true && dataValidator(transactionData);
    }
    
    async recordRedemption(ctx: IRedemptionContext) {
        const token = this.genToken(ctx);
        const dataKey = this.dataKey(ctx.transaction);

        await PromotionServ.updatePromotionData(ctx.promotionId, token, {$inc: {[dataKey]: 1}});
    }
    
    async isUsable(ctx: IRedemptionBatchContext): Promise<{[trId: string]: boolean}> {
        const tokens = ctx.transactions.map((tr, i) => ({
            token: this.genToken(PromotionServ.getSingleCtx(ctx, i)),
            transaction: tr
        }));
        
        const dataKeys = ctx.transactions.map(this.dataKey);
        const promoDataArr = await PromotionData.find({token: _.uniq(tokens.map(tk => tk.token))}, {fields: _.arrToObj(dataKeys, k => k, k => 1)}).toArray();
        const promoData = _.keyBy(promoDataArr, d => d.token);
        
        const maxUse: number = ctx.config.data;
        const result = _.arrToObj(tokens, tk => tk.transaction.id, (tk, i) => {
            const data = promoData[tk.token];
            return ((_.get(data, this.dataKey(tk.transaction)) || 0) + i < maxUse);
        });

        return result;
    }
}