import _ from '../../utils/_';
import { IPromotionReward } from './index';
import { ajv2 } from '../../utils/ajv2';

const ajv = ajv2();

const dataValidator = ajv({
    '+@item': {
        '+@price': 'number|>0'
    }
});

interface ItemData {
    price: number;
}

export class DiscountAmountReward implements IPromotionReward {
    key() {
        return 'discount_amount';
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

    async applyPromotion(config: number, data: any): Promise<any> {
        const discountAmount = config;
        const item: ItemData = data.item;
        item.price = Math.max(0, item.price - discountAmount);
        return data;
    }
}