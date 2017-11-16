import * as moment from 'moment';
import _ from '../../utils/_';
import { MaxUsagePerUserRule } from './max_usage_per_user_rule';
import { MaxUsageRule } from './max_usage_rule';
import { IPromotion, IPromoTransaction } from '../../models/index';

export interface IPromotionRule {
    key(): string;
    isValidConfig(data: any): Promise<boolean>;
    isValidTransactionData(transactionData: any): Promise<boolean>;
    isUsable(ctx: IRedemptionContext): Promise<boolean>;
    recordRedemption(ctx: IRedemptionContext): Promise<void>;
}

export interface IRedemptionContext {
    promotionId: string;
    config: any;
    transaction: IPromoTransaction
}

export class PromotionRules {
    static readonly RULES: IPromotionRule[] = [new MaxUsagePerUserRule(), new MaxUsageRule()];
    static readonly RULE_REPOSITORY = _.keyBy(PromotionRules.RULES, r => r.key());
    
    static async isValidConfig(data: any): Promise<boolean> {
        if (!_.isObject(data)) {
            return false;
        }

        for (const key in data) {
            const rule = this.RULE_REPOSITORY[key];
            if (!rule) {
                return false;
            }

            const isValid = await rule.isValidConfig(data[key]);
            if (!isValid) {
                return false;
            }
        }
        return true;
    }

    static async isValidData(rules: any, data: any): Promise<boolean> {
        if (!_.isObject(data)) {
            return false;
        }

        for (const key in rules) {
            const rule = this.RULE_REPOSITORY[key];
            if (!rule) {
                return false;
            }

            const isValid = await rule.isValidTransactionData(data);
            if (!isValid) {
                return false;
            }
        }
        
        return true;
    }
    
    static async recordRedemption(promotion: IPromotion, transaction: IPromoTransaction): Promise<void> {
        const rules = _.keys(promotion.rules).map(r => this.RULE_REPOSITORY[r]).filter(r => r != null);
        await Promise.all(rules.map(r => r.recordRedemption({
            promotionId: `${promotion._id}`,
            config: promotion.rules[r.key()],
            transaction: transaction
        })));
    }

    static async isUsable(promotion: IPromotion, transaction: IPromoTransaction): Promise<boolean> {
        for (const key in promotion.rules) {
            const rule = this.RULE_REPOSITORY[key];
            if (!rule) {
                return false;
            }
            
            const config = promotion.rules[key];
            const isUsable = await rule.isUsable({
                promotionId: `${promotion._id}`,
                config: promotion.rules[key],
                transaction: transaction
            });
            
            if (!isUsable) {
                return false;
            }
        }
        return true;
    }
}

export default PromotionRules;