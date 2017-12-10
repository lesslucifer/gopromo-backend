import _ from '../../utils/_';

import { DiscountPercentReward } from './discount_percent';
import { DiscountAmountReward } from './discount_amount';
import { IRewardConfig } from '../../models/index';

export interface IPromotionReward {
    key(): string;
    isValidConfig(data: any): Promise<boolean>;
    isValidTransactionData(transactionData: any): Promise<boolean>;
    applyPromotion(config: any, transactionData: any): Promise<any>;
}

export class PromotionRewards {
    static readonly REWARDS: IPromotionReward[] = [new DiscountPercentReward(), new DiscountAmountReward()];
    static readonly REWARD_REPOSITORY = _.keyBy(PromotionRewards.REWARDS, r => r.key());

    static async isValidConfig(rewardConfigs: IRewardConfig[]): Promise<boolean> {
        for (const rewardConfig of rewardConfigs) {
            const reward = this.REWARD_REPOSITORY[rewardConfig.type];
            if (!reward) {
                return false;
            }

            const isValid = await reward.isValidConfig(rewardConfig.data);
            if (!isValid) {
                return false;
            }
        }

        return true;
    }
    
    static async isValidTransactionData(rewards: IRewardConfig[], transactionData: any): Promise<boolean> {
        for (const rewardConfig of rewards) {
            const reward = this.REWARD_REPOSITORY[rewardConfig.type];
            if (!reward) {
                return false;
            }

            const isValid = await reward.isValidTransactionData(transactionData);
            if (!isValid) {
                return false;
            }
        }
        
        return true;
    }
    
    static async applyPromotion(rewards: IRewardConfig[], transactionData: any): Promise<any> {
        let rewarded = _.cloneDeep(transactionData);

        for (const rewardConf of rewards) {
            const reward = this.REWARD_REPOSITORY[rewardConf.type];
            if (reward) {
                rewarded = await reward.applyPromotion(rewardConf.data, rewarded);
            }
        }
        
        return rewarded;
    }
}

export default PromotionRewards;