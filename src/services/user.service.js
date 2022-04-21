import crypto from 'crypto';

export default class UserService {
  static hashPassword(password) {
    return new Promise((resolve, reject) => {
      try {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('hex');

        return resolve(`${salt}$${hash}`);
      } catch (error) {
        return reject(error);
      }
    });
  }
}

/**
 * Singleton class to get logged user.
 */
export class UserMgr {
  static getInstance() {
    if (!UserMgr.instance) {
      UserMgr.instance = new UserMgr();
    }
    return UserMgr.instance;
  }

  setUser(user) {
    this._user = user;
  }

  getCurrentUser() {
    if (!this._user)
      throw new Error(`Unable to get current user, ensure ${this.constructor.name} is initiated.`);
    return this._user;
  }
}
