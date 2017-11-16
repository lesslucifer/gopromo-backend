import * as moment from 'moment';
import _ from '../../utils/_';
import { IPromotionRule, IPromotionContext } from './index'
import { ajv2 } from '../../utils/ajv2';
import { IPromotion, IPromotionData } from '../../models/index';
import { PromotionServ } from '../promotion';
import { HC } from '../../glob/hc';

const _ajv = ajv2();

export class PromotionContextMaxUsage implements IPromotionContext {
    constructor(data: any) {
        this.usage = data.usage;
    }
    usage: string;
}

export class MaxUsageRule implements IPromotionRule {
    key() {
        return 'max_usage';
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
    
    async recordRedemption(promotion: IPromotion, transactionData: any) {
        const token = PromotionServ.genDataToken(`${promotion._id}`);
        const dataKey = `data.${this.key()}.n_use`;

        await PromotionServ.updatePromotionData(promotion._id, token, {$inc: {key: 1}});
    }

    async checkUsage(ctx: PromotionContextMaxUsage): Promise<boolean> {
        console.log(ctx.usage);
        return true;
    }

    async buildContext(data: any): Promise<IPromotionContext> {
        return new PromotionContextMaxUsage(data);
    }
}