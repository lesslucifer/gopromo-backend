import _ from '../../utils/_';

import { DiscountPercentReward } from './discount_percent';
import { DiscountAmountReward } from './discount_amount';

export interface IPromotionReward {
    key(): string;
    isValid(data: any): Promise<boolean>;
}

export class PromotionRewards {
    readonly REWARDS: IPromotionReward[] = [new DiscountPercentReward(), new DiscountAmountReward()];
    readonly REWARD_REPOSITORY = _.keyBy(this.REWARDS, r => r.key());

    async isValid(data: any): Promise<boolean> {
        if (!_.isObject(data)) {
            return false;
        }

        for (const key in data) {
            const reward = this.REWARD_REPOSITORY[key];
            if (!reward) {
                return false;
            }

            const isValid = await reward.isValid(data[key]);
            if (!isValid) {
                return false;
            }
        }

        return true;
    }
}