import { pick } from 'lodash';
import config from 'config';
import { sequelize, User } from '../database/models';

import UserService from '../services/user.service';
import ValidateHelper from '../utils/ValidatorHelper';
import CustomError from '../utils/CustomError';
import RespUtil from '../utils/RespUtil';
import { QueueService } from '../services/queue.service';
/**
 * Auth Controller
 * - change password
 * - generate reset password link
 * - validate reset password token
 * - reset password
 */

const util = new RespUtil();
const { env } = config.get('general');
const { validatePasswordOnly, updatePassword } = ValidateHelper;

const resetPassword = new QueueService('reset-password-mail');

export default class AuthController {
  // reset password
  static async changePassword(req, res) {
    let { user } = req;

    try {
      const payload = pick(req.body, ['current_password', 'password', 'confirm_password']);

      const { error, value } = updatePassword().validate(payload);
      if (error) throw new CustomError(error.message);

      user = await User.findOne({ where: { id: user.id } });

      const check = await user.validatePassword(payload.current_password);
      if (!check) throw new CustomError('Current password did not match with our record!');

      const password = await UserService.hashPassword(value.password);

      await user.update({ password });

      util.setSuccess(200, 'Password update successfully!', {});
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async generateResetPasswordLink(req, res) {
    try {
      const { email_or_phone: emailOrPhoneNo } = pick(req.body, ['email_or_phone']);
      if (!emailOrPhoneNo) throw new Error('Email or Phone Number is required to reset password!');

      const msg = `If an account exists for ${emailOrPhoneNo}, you will receive password reset instructions.`;
      const data = emailOrPhoneNo.trim().split(' ')[0];

      const payload = await sequelize.query(
        `SELECT * FROM user WHERE email = :payload OR phone_number = :payload`,
        { replacements: { payload: data }, model: User, mapToModel: true }
      );

      if (!payload[0]) throw new CustomError(msg, 200);

      if (!['test'].includes(env)) {
        await resetPassword.topic('resetPasswordMail').publish({ ...payload[0].toJSON() });
      }

      util.setSuccess(200, msg, {});
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async validateResetPasswordToken(req, res) {
    const currentTime = Math.floor(Date.now() / 1000);

    try {
      const payload = pick(req.body, ['password_reset_token']);
      if (!payload.password_reset_token) throw new Error('Password reset token field required!');

      const user = await User.findOne({ where: { reset_token: payload.password_reset_token } });

      if (user && user.reset_expires > currentTime) {
        util.setSuccess(200, 'Password reset token is valid!', {});
        return util.send(res);
      }

      throw new Error('Password reset token is invalid or expired');
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async resetPassword(req, res) {
    const { reset_token } = req.params;
    const currentTime = Math.floor(Date.now() / 1000);

    try {
      const user = await User.findOne({ where: { reset_token } });

      if (user && user.reset_expires > currentTime) {
        const payload = pick(req.body, ['password', 'confirm_password']);

        const { error, value } = validatePasswordOnly().validate(payload);
        if (error) throw new CustomError(error.message);

        const hash = await UserService.hashPassword(value.password);
        await user.update({ password: hash, reset_expires: null, reset_token: null });

        util.setSuccess(200, 'Password reset successfully, please login to proceed!', {});
        return util.send(res);
      }

      throw new Error('Password reset token is invalid or expired');
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }
}
