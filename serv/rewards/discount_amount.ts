import _ from '../../utils/_';
import { IPromotionReward } from './index';

export class DiscountAmountReward implements IPromotionReward {
    key() {
        return 'discount_amount';
    }

    async isValid(data: any): Promise<boolean> {
        const val = _.parseIntNull(data);
        if (val == null) {
            return false;
        }

        return 0 < val;
    }
}