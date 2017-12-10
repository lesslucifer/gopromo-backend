import * as moment from 'moment';
import _ from '../../utils/_';
import { IPromotionRule, IRedemptionContext } from './index'
import { ajv2 } from '../../utils/ajv2';
import { IPromotion, IPromotionData, Promotion, PromotionData } from '../../models/index';
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

    dataKey(ctx: IRedemptionContext) {
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
        const dataKey = this.dataKey(ctx);

        await PromotionServ.updatePromotionData(ctx.promotionId, token, {$inc: {[dataKey]: 1}});
    }

    async isUsable(ctx: IRedemptionContext): Promise<boolean> {
        const token = this.genToken(ctx);
        const dataKey = this.dataKey(ctx);
        const data = await PromotionData.findOne<IPromotionData>({token: token}, {fields: {[dataKey]: 1}});

        const maxUse: number = ctx.config.data;
        
        return (_.get(data, dataKey) || 0) < maxUse;
    }
}