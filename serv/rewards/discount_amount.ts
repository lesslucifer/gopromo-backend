import _ from '../../utils/_';
import { IPromotionReward } from './index';
import { ajv2 } from '../../utils/ajv2';

const ajv = ajv2();

const transactionDataValidator = ajv({
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
    
    async isValidTransactionData(transactionData: any): Promise<boolean> {
        return true && transactionDataValidator(transactionData);
    }

    async applyPromotion(config: number, transactionData: any): Promise<any> {
        const discountAmount = config;
        const item: ItemData = transactionData.item;
        item.price = Math.max(0, item.price - discountAmount);
        return transactionData;
    }
}