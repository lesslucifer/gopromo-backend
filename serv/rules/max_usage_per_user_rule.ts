import * as moment from 'moment';
import _ from '../../utils/_';
import ajv2 from '../../utils/ajv2';
import { IPromotionRule, IRedemptionContext } from './index';
import { IPromotion, IPromotionData, PromotionData } from '../../models/index';
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

    dataKey(ctx: IRedemptionContext) {
        return `data.${this.key()}.${ctx.transaction.data.user.id}.n_use`;
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
        const dataKey = this.dataKey(ctx);

        await PromotionServ.updatePromotionData(ctx.promotionId, token, {$inc: {[dataKey]: 1}});
    }
    
    async isUsable(ctx: IRedemptionContext): Promise<boolean> {
        const token = this.genToken(ctx);
        const dataKey = this.dataKey(ctx);
        const data = await PromotionData.findOne<IPromotionData>({token: token}, {fields: {[dataKey]: 1}});

        const maxUse: number = ctx.config;
        
        return (_.get(data, dataKey) || 0) < maxUse;
    }
}