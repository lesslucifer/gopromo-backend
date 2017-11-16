import _ from '../../utils/_';
import ajv2 from '../../utils/ajv2';
import { IPromotionRule, IPromotionContext } from './index';

const _ajv = ajv2();
const dataValidator = _ajv({
    '+@user': {
        '+@id': 'string'
    }
});

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
    
    async isValidData(data: any): Promise<boolean> {
        return true && dataValidator(data);
    }

    async checkUsage(ctx: IPromotionContext): Promise<boolean> {
        console.log(ctx);
        return true;
    }

    async buildContext(data: any): Promise<IPromotionContext> {
        return new PromotionContextMaxUsagePerUser(data);
    }
}