import _ from '../../utils/_';
import ajv2 from '../../utils/ajv2';
import { IPromotionReward } from './index';

const ajv = ajv2();
const validJson = ajv({
    '+@percent': 'number|>=0|<=100',
    '+@max_amount': 'integer|>=0',
    '++': false
});

export class DiscountPercentReward implements IPromotionReward {
    key() {
        return 'discount_percent';
    }

    async isValid(data: any): Promise<boolean> {
        return true && validJson(data);
    }
}