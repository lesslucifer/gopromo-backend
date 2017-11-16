import _ from '../../utils/_';

import { DiscountPercentReward } from './discount_percent';
import { DiscountAmountReward } from './discount_amount';

export interface IPromotionReward {
    key(): string;
    isValidConfig(data: any): Promise<boolean>;
    isValidData(data: any): Promise<boolean>;
    applyPromotion(config: any, data: any): Promise<any>;
}

export class PromotionRewards {
    static readonly REWARDS: IPromotionReward[] = [new DiscountPercentReward(), new DiscountAmountReward()];
    static readonly REWARD_REPOSITORY = _.keyBy(PromotionRewards.REWARDS, r => r.key());

    static async isValidConfig(data: any): Promise<boolean> {
        if (!_.isObject(data)) {
            return false;
        }

        for (const key in data) {
            const reward = this.REWARD_REPOSITORY[key];
            if (!reward) {
                return false;
            }

            const isValid = await reward.isValidConfig(data[key]);
            if (!isValid) {
                return false;
            }
        }

        return true;
    }
    
    static async isValidData(rewards: any, data: any): Promise<boolean> {
        if (!_.isObject(data)) {
            return false;
        }

        for (const key in rewards) {
            const reward = this.REWARD_REPOSITORY[key];
            if (!reward) {
                return false;
            }

            const isValid = await reward.isValidData(data);
            if (!isValid) {
                return false;
            }
        }
        
        return true;
    }
}

export default PromotionRewards;