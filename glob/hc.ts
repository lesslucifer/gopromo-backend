import * as moment from 'moment';
export class HC {
    static readonly SUCCESS = {success: true};
    static readonly MINUTES_PER_DAY = 24 * 60;

    static readonly DEFAULT_PROMO_COUNT = 100;
    static readonly HUMAN32_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    static readonly DEFAULT_PROMO_PATTERN = '########';
    static readonly BEGIN_DATE = moment('2010-01-01', 'YYYY-MM-DD');
    static readonly DEFAULT_APP_NAME = 'promotion';
}

export default HC;