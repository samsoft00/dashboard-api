import passport from 'passport';
import passportJWT from 'passport-jwt';
import LocalStrategy from 'passport-local';
import config from 'config';
import Bugsnag from '@bugsnag/js';
import { isNull } from 'lodash';

import CustomError from './CustomError';

const { User, Roles, Department, Permission } = require('../database/models');

const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

const params = {
  secretOrKey: config.get('auth.secret'),
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
};

passport.use(
  'jwt',
  new JWTStrategy(params, async (payload, done) => {
    const user = payload.data;

    try {
      const logdUser = await User.findOne({
        where: { id: user.id },
        attributes: { exclude: ['password', 'reset_token', 'reset_expires'] },
        include: [
          { model: Roles, as: 'roles' },
          { model: Department, as: 'department' },
        ],
      });

      if (!logdUser) return done(null, false, { message: 'Incorrect login credentials.' });

      return done(null, logdUser);
    } catch (error) {
      return done(error, null);
    }
  })
);

passport.use(
  'login',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: false,
    },
    async (email, password, done) => {
      try {
        /*
        const MAX_ATTEMPTS = 3;
        const prfx = 'login:attempt';

        let r = await Cache(email, prfx, {
          args: [email],
          fnc: () => {},
        });

        if (r && r.is_locked && r.lock_until > new Date().getTime()) {
          throw new CustomError(
            `You have exceeded the maximum number of login attempts. Your account is locked until ${moment(
              r.lock_until
            )
              .utc()
              .format('LT z')}`
          );
        }
        */
        const user = await User.findOne({
          where: { email },
          attributes: {
            exclude: ['department_id'],
          },
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'name', 'slug'],
            },
            {
              model: Roles,
              as: 'roles',
              through: { attributes: [] },
              attributes: ['id', 'name', 'code'],
              include: [{ model: Permission, as: 'permissions' }],
            },
          ],
        });

        if (isNull(user)) {
          throw new CustomError('Invalid login credentials, check and try again!');
        }

        const check = await user.validatePassword(password);
        if (!check) {
          /*
          // login_attempts, is_locked, lock_until

          const timer = r && r.login_attempts ? +r.login_attempts : 1;
          const lockUntil = moment(Date.now()).utc().add(15, 'm').toDate().getTime();
          const timeLeft = MAX_ATTEMPTS - timer;

          // update Redis
          r = await Cache(email, prfx, {
            args: [email],
            fnc: (e) => {
              return {
                email: e,
                login_attempts: timer + 1,
                ...(timer >= MAX_ATTEMPTS && { is_locked: true, lock_until: lockUntil }),
              };
            },
            upsert: true,
            expire: 60 * 15, // 15 minutes
          });

          const errMsg = timeLeft
            ? `Incorrect credentials combination, ${timeLeft} attempt${
                timeLeft === 1 ? '' : 's'
              } left`
            : `You have exceeded the maximum number of login attempts. Your account is locked until ${moment(
                lockUntil
              )
                .utc()
                .format('LT z')}`;
              */
          throw new CustomError('Invalid login credentials, check and try again.');
        }

        const { roles } = user;
        // const permission = await role.getPermission();

        // userRoles.forEach(eachRole => { roleArr.push(eachRole.role); });
        if (!roles || user.is_disabled === 0)
          throw new CustomError('Account disabled or Unauthorized Access', 401);

        Bugsnag.setUser(user.id, user.email, user.fullname);
        done(null, user);
      } catch (error) {
        done({ statusCode: error.statusCode || 400, message: error.message });
      }
    }
  )
);
