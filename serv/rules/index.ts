import _ from '../../utils/_';

interface IPromotionRule {
    key(): string;
    isValid(data: any): Promise<boolean>;
}

class PromotionRules {
    readonly RULES: IPromotionRule[] = [];
    readonly RULE_REPOSITORY = _.keyBy(this.RULES, r => r.key());

    async isValid(data: any): Promise<boolean> {
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
    }
}