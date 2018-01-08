import * as moment from 'moment';
import _ from '../../utils/_';
import { MaxUsagePerUserRule } from './max_usage_per_user_rule';
import { MaxUsageRule } from './max_usage_rule';
import { IPromotion, IPromoTransaction, IRuleConfig } from '../../models/index';

export interface IPromotionRule {
    key(): string;
    isValidConfig(data: any): Promise<boolean>;
    isValidTransactionData(transactionData: any): Promise<boolean>;
    isUsable(ctxs: IRedemptionBatchContext): Promise<{[trId: string]: boolean}>;
    recordRedemption(ctx: IRedemptionContext): Promise<void>;
}

export interface IRedemptionContext {
    promotionId: string;
    config: IRuleConfig;
    transaction: IPromoTransaction
}

export interface IRedemptionBatchContext {
    promotionId: string;
    config: IRuleConfig;
    transactions: IPromoTransaction[]
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

    static async isUsable(promotion: IPromotion, transactions: IPromoTransaction[]): Promise<{transaction: IPromoTransaction, isUsable: boolean}[]> {
        const result = transactions.map(tr => ({
            transaction: tr,
            isUsable: true
        }));

        for (const ruleConfig of promotion.rules) {
            const rule = this.RULE_REPOSITORY[ruleConfig.type];
            if (!rule) {
                result.forEach(r => r.isUsable = false);
                return result;
            }
            
            const usableResult = await rule.isUsable({
                promotionId: `${promotion._id}`,
                config: ruleConfig,
                transactions: transactions
            });
            
            result.forEach(r => r.isUsable = r.isUsable && usableResult[r.transaction.id]);
        }

        return result;
    }

    static isUsableOne(promotion: IPromotion, transaction: IPromoTransaction) {
        return this.isUsable(promotion, [transaction]).then(r => _.first(r).isUsable);
    }
}

export default PromotionRules;