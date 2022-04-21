/* eslint-disable default-case */
import passport from 'passport';
import { isUndefined, isNull, pick } from 'lodash';

import ResUtil from '../utils/RespUtil';
import ValidatorHelper from '../utils/ValidatorHelper';

const util = new ResUtil();
const { validateLogin } = ValidatorHelper;

const authMiddleware = (req, res, next) =>
  passport.authenticate('jwt', { session: false }, (error, user, info) => {
    if (isUndefined(info) && !error) {
      req.user = user;
      return next();
    }
    /*
    if (isUndefined(req.user)) {
      return util.setError(401, 'Authentication error, please login again!').send(res);
    }

    if (error)
      return util
        .setError(401, error.message || error || 'Authentication error, please login again!')
        .send(res);
*/
    if (!info) return util.setError(400, 'Authentication error, please login again!').send(res);

    switch (info.name) {
      case 'TokenExpiredError':
        return util.setError(401, 'Authentication token expired!').send(res);
      case 'JsonWebTokenError':
        return util.setError(400, 'Invalid Authentication token!').send(res);
      case 'Error':
        return util.setError(400, info.message).send(res);
      default:
        return util.setError(400, 'Authentication error, please login again!').send(res);
    }
  })(req, res, next);

/**
 * Login Middleware
 */
const loginMiddleware = (req, res, next) =>
  passport.authenticate('login', async (error, user) => {
    if (isNull(error) || !error) {
      await user.update({
        last_login_date: new Date(),
        last_login_ip: req.headers['x-real-ip'],
      });

      req.user = user;
      return next();
    }

    return util.setError(error?.statusCode || 400, error.message).send(res);
  })(req, res, next);

const validateUserLogin = async (req, res, next) => {
  try {
    const payload = pick(req.body, ['email', 'password']);
    await validateLogin().validateAsync(payload);

    return next();
  } catch (error) {
    return util.setError(400, error.message).send(res);
  }
};

/**
 *
 */
// eslint-disable-next-line no-unused-vars
const mustBeAdmin = (req, res, next) => {
  const { user } = req;
  const role = 'ADMIN';

  const hasRole = user.roles.filter((x) => role === x.code.toUpperCase());
  if (hasRole.length) return next();

  return util
    .setError(401, 'Permission Denied, you are not authorized to perform this action')
    .send(res);
};

export {
  validateUserLogin,
  loginMiddleware as isLogin,
  authMiddleware as isAuthenticated,
  mustBeAdmin as isAdmin,
};
