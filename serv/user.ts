import _ from '../utils/_';
import { IUser, IUserInfo, User } from '../models';

export class UserServ {
    static get InfoKeys() {
        return ['_id', 'fullName', 'email', 'phone', 'company', 'companySize', 'roles'];
    }

    static get InfoSelect() {
        return _.zipToObj(this.InfoKeys, k => 1);
    }

    static getSHA1WithSalt(salt: string, password: string) {
        const pws = `${password}${salt}`;
        return _.sha1(pws);
    }

    static getSHA1(user: IUser, password: string) {
        return this.getSHA1WithSalt(user.passwordSalt, password);
    }

    static setPassword(user: IUser, password: string) {
        user.passwordSalt = _.randomstring.generate({length: 32});
        user.passwordSHA1 = this.getSHA1(user, password);
        return user;
    }

    static getUserByAuthID(authID: string): Promise<IUserInfo> {
        return <Promise<IUserInfo>> User.findOne({'auth.authID': authID}, {fields: this.InfoSelect});
    }

    static info(user: IUser): IUserInfo {
        return <IUserInfo> _.pick(user, this.InfoKeys);
    }
}

export default UserServ;