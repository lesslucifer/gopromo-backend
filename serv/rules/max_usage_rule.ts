import _ from '../../utils/_';
import { IPromotionRule, IPromotionContext } from './index'

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

    async isValid(data: any): Promise<boolean> {
        const val = _.parseIntNull(data);
        if (val == null) {
            return false;
        }

        return 0 < val;
    }

    async checkUsage(ctx: PromotionContextMaxUsage): Promise<boolean> {
        console.log(ctx.usage);
        return true;
    }

    async buildContext(data: any): Promise<IPromotionContext> {
        return new PromotionContextMaxUsage(data);
    }
}