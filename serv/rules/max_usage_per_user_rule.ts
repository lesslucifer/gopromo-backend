import _ from '../../utils/_';
import ajv2 from '../../utils/ajv2';
import { IPromotionRule, IPromotionContext } from './index'

const ajv = ajv2();
const validJson = ajv({
    '+@max_usage': 'number|>0',
    '+@userId': 'string|>0',
    '++': false
});

export class PromotionContextMaxUsagePerUser implements IPromotionContext{
    constructor(data: any) {
        this.userId = data.userId;
    }
    userId: string;
}

export class MaxUsagePerUserRule implements IPromotionRule {
    key() {
        return 'max_usage_per_user';
    }

    async isValid(data: any): Promise<boolean> {
        return true && validJson(data);
    }

    async checkUsage(ctx: IPromotionContext): Promise<boolean> {
        console.log(ctx);
        return true;
    }

    async buildContext(data: any): Promise<IPromotionContext> {
        return new PromotionContextMaxUsagePerUser(data);
    }
}