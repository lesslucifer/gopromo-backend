import _ from '../../utils/_';
import { IPromotionRule, IPromotionContext } from './index'

export class PromotionContextMaxUsagePerUser implements IPromotionContext {
    constructor(data: any) {
        this.userId = data.userId;
    }
    userId: string;
}

export class MaxUsagePerUserRule implements IPromotionRule {
    key() {
        return 'max_usage_per_user_per_day';
    }

    async isValid(data: any): Promise<boolean> {
        const val = _.parseIntNull(data);
        if (val == null) {
            return false;
        }

        return 0 < val;
    }

    async checkUsage(ctx: IPromotionContext): Promise<boolean> {
        console.log(ctx);
        return true;
    }

    async buildContext(data: any): Promise<IPromotionContext> {
        return new PromotionContextMaxUsagePerUser(data);
    }
}