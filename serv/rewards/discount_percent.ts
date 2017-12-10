import _ from '../../utils/_';
import ajv2 from '../../utils/ajv2';
import { IPromotionReward } from './index';

const ajv = ajv2();
const configValidator = ajv({
    '+@percent': 'number|>=0|<=100',
    '+@max_amount': 'integer|>=0',
    '++': false
});

interface DiscountConfig {
    percent: number;
    max_amount: number;
}

const dataValidator = ajv({
    '+@item': {
        '+@price': 'number|>0'
    }
});

interface ItemData {
    price: number;
}

export class DiscountPercentReward implements IPromotionReward {
    key() {
        return 'discount_percent';
    }

    async isValidConfig(data: any): Promise<boolean> {
        return true && configValidator(data);
    }
    
    async isValidTransactionData(transactionData: any): Promise<boolean> {
        return true && dataValidator(transactionData);
    }
    
    async applyPromotion(config: DiscountConfig, transactionData: any): Promise<any> {
        const item: ItemData = transactionData.item;
        const discountAmount = Math.min(item.price * (config.percent / 100), config.max_amount);
        item.price = Math.max(0, item.price - discountAmount);
        return transactionData;
    }
}