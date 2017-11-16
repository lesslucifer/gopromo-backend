import * as moment from 'moment';
import _ from '../../utils/_';
import ajv2 from '../../utils/ajv2';
import { IPromotionRule, IPromotionContext } from './index';
import { IPromotion, IPromotionData } from '../../models/index';
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

export class PromotionContextMaxUsagePerUser implements IPromotionContext {
    constructor(data: any) {
        this.userId = data.userId;
    }
    userId: string;
}

export class MaxUsagePerUserRule implements IPromotionRule {
    key() {
        return 'max_usage_per_user';
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
    
    async recordRedemption(promotion: IPromotion, transactionData: ITransactionData) {
        const userIdHash = PromotionServ.genIdHash(transactionData.user.id);
        const token = PromotionServ.genDataToken(`${promotion._id}_${userIdHash}`);
        const dataKey = `data.${this.key()}.${transactionData.user.id}.n_use`;

        await PromotionServ.updatePromotionData(promotion._id, token, {$inc: {key: 1}});
    }

    async checkUsage(ctx: IPromotionContext): Promise<boolean> {
        console.log(ctx);
        return true;
    }

    async buildContext(data: any): Promise<IPromotionContext> {
        return new PromotionContextMaxUsagePerUser(data);
    }
}