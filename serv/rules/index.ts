import * as moment from 'moment';
import _ from '../../utils/_';
import { MaxUsagePerUserRule } from './max_usage_per_user_rule';
import { MaxUsageRule } from './max_usage_rule';
import { IPromotion, IPromoTransaction, IRuleConfig } from '../../models/index';

export interface IPromotionRule {
    key(): string;
    isValidConfig(data: any): Promise<boolean>;
    isValidTransactionData(transactionData: any): Promise<boolean>;
    isUsable(ctx: IRedemptionContext): Promise<boolean>;
    recordRedemption(ctx: IRedemptionContext): Promise<void>;
}

export interface IRedemptionContext {
    promotionId: string;
    config: IRuleConfig;
    transaction: IPromoTransaction
}

export class PromotionRules {
    static readonly RULES: IPromotionRule[] = [new MaxUsagePerUserRule(), new MaxUsageRule()];
    static readonly RULE_REPOSITORY = _.keyBy(PromotionRules.RULES, r => r.key());
    
    static async isValidConfig(configs: IRuleConfig[]): Promise<boolean> {

        for (const config of configs) {
            const rule = this.RULE_REPOSITORY[config.type];
            if (!rule) {
                return false;
            }

            const isValid = await rule.isValidConfig(config.data);
            if (!isValid) {
                return false;
            }
        }
        return true;
    }

    static async isValidTransactionData(rules: IRuleConfig[], transactionData: any): Promise<boolean> {
        for (const ruleConfig of rules) {
            const rule = this.RULE_REPOSITORY[ruleConfig.type];
            if (!rule) {
                return false;
            }

            const isValid = await rule.isValidTransactionData(transactionData);
            if (!isValid) {
                return false;
            }
        }
        
        return true;
    }
    
    static async recordRedemption(promotion: IPromotion, transaction: IPromoTransaction): Promise<void> {
        const rules = promotion.rules.map(r => ({
            rule: this.RULE_REPOSITORY[r.type],
            config: r
        })).filter(r => r.rule != null)

        await Promise.all(rules.map(r => r.rule.recordRedemption({
            promotionId: `${promotion._id}`,
            config: r.config,
            transaction: transaction
        })));
    }

    static async isUsable(promotion: IPromotion, transaction: IPromoTransaction): Promise<boolean> {
        for (const ruleConfig of promotion.rules) {
            const rule = this.RULE_REPOSITORY[ruleConfig.type];
            if (!rule) {
                return false;
            }
            
            const isUsable = await rule.isUsable({
                promotionId: `${promotion._id}`,
                config: ruleConfig,
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