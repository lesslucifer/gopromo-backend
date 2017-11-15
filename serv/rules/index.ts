import _ from '../../utils/_';
import { MaxUsagePerUserRule } from './max_usage_per_user_rule';
import { MaxUsageRule } from './max_usage_rule';

export interface IPromotionRule {
    key(): string;
    isValid(data: any): Promise<boolean>;
    checkUsage(ctx: IPromotionContext): Promise<boolean>;
    buildContext(data: any): Promise<IPromotionContext>;
}

export interface IPromotionContext {
    
}

export class PromotionRules {
    static readonly RULES: IPromotionRule[] = [new MaxUsagePerUserRule(), new MaxUsageRule()];
    static readonly RULE_REPOSITORY = _.keyBy(PromotionRules.RULES, r => r.key());
    
    static async isValid(data: any): Promise<boolean> {
        if (!_.isObject(data)) {
            return false;
        }

        for (const key in data) {
            const rule = this.RULE_REPOSITORY[key];
            if (!rule) {
                return false;
            }

            const isValid = await rule.isValid(data[key]);
            if (!isValid) {
                return false;
            }
        }
        return true;
    }

    static async checkUsage(data: any): Promise<boolean> {
        if (!_.isObject(data)) {
            return false;
        }

        for (const key in data) {
            const rule = this.RULE_REPOSITORY[key];
            if (!rule) {
                return false;
            }
            const context: IPromotionContext = await rule.buildContext(data[key]);
            const checkUsage = await rule.checkUsage(context);
            if (!checkUsage) {
                return false;
            }
        }
        return true;
    }
}

export default PromotionRules;