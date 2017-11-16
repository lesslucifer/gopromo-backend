import * as moment from 'moment';
import _ from '../../utils/_';
import { IPromotionRule, IRedemptionContext } from './index'
import { ajv2 } from '../../utils/ajv2';
import { IPromotion, PromotionData, Promotion } from '../../models/index';
import { PromotionServ } from '../promotion';
import { HC } from '../../glob/hc';

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
        return 'max_usage_per_user_per_day';
    }

    genToken(ctx: IRedemptionContext) {
        const transactionData: ITransactionData = ctx.transaction.data;
        const userIdHash = PromotionServ.genIdHash(transactionData.user.id);
        const dateNum = moment(ctx.transaction.time).diff(HC.BEGIN_DATE, 'd');
        const token = PromotionServ.genDataToken(`${ctx.promotionId}_${userIdHash}_${dateNum}`);
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
        const data = await PromotionData.findOne({token: token}, {fields: {[dataKey]: 1}});
        
        const maxUse: number = ctx.config.data;

        return (_.get(data, dataKey) || 0) < maxUse;
    }
}