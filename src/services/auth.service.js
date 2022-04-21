import jwt from 'jsonwebtoken';
import config from 'config';

const { secret, signOptions } = config.get('auth');

export default class AuthService {
  static generateAccessToken(payload) {
    return jwt.sign({ data: payload }, secret, { expiresIn: signOptions.expiresIn });
  }
}
