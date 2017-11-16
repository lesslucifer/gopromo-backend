import _ from '../../utils/_';
import { IPromotionRule, IPromotionContext } from './index'
import { ajv2 } from '../../utils/ajv2';

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
    
    async isValidData(data: any): Promise<boolean> {
        return true;
    }

    async checkUsage(ctx: PromotionContextMaxUsage): Promise<boolean> {
        console.log(ctx.usage);
        return true;
    }

    async buildContext(data: any): Promise<IPromotionContext> {
        return new PromotionContextMaxUsage(data);
    }
}