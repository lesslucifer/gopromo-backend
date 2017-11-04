import _ from '../../utils/_';
import ajv2 from '../../utils/ajv2';
import { IPromotionRule, IPromotionContext } from './index'

const ajv = ajv2();
const validJson = ajv({
    '+@max_usage': 'number|>0',
    '++': false
});

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
        return true && validJson(data);
    }

    async checkUsage(ctx: PromotionContextMaxUsage): Promise<boolean> {
        console.log(ctx.usage);
        return true;
    }

    async buildContext(data: any): Promise<IPromotionContext> {
        return new PromotionContextMaxUsage(data);
    }
}