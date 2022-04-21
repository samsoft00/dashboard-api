/* eslint-disable radix */
import ip from 'ip';
import { QueryTypes } from 'sequelize';
import { pick, omit, isUndefined } from 'lodash';
import config from 'config';
import { NotFound } from 'http-errors';
import Utility from '../utils/Utility';
import Generator from '../utils/Generator';
import RespUtil from '../utils/RespUtil';
import AuthService from '../services/auth.service';
import Paginate from '../utils/Pagination';
import ValidateHelper from '../utils/ValidatorHelper';
import { QueueService } from '../services/queue.service';
import { sequelize, User, Department, UserRoles, Permission, Roles } from '../database/models';
import UserService from '../services/user.service';
import ErrorHandler from '../errors/error.handler';
import CustomError from '../utils/CustomError';
import UserResponse from '../response/user.response';

const util = new RespUtil();
const { newPagHandler, formatPhoneNumber } = Utility;
const { validateUser, validateUpdateUser, validateUserRole } = ValidateHelper;

const { env } = config.get('general');
const sendMailQueue = new QueueService('send-login-email');

/**
 * check if user exist
 */
const checkUserExist = async (email) => {
  const check = await User.findOne({ where: { email } });
  if (check) throw new CustomError('This email is already registered.');
};

export default class UserController {
  static async getAllUser(req, res) {
    const { page, limit, search } = req.query;

    const currentPage = parseInt(page) || 1;
    const defaultLimit = parseInt(limit) || 100;
    let searchQry = {};

    if (!isUndefined(search) && search !== '') {
      searchQry = {
        where: {
          fullname: {
            $like: `%${search}%`,
          },
        },
      };
    }

    try {
      const pagOptns = newPagHandler(currentPage, defaultLimit, 'id');

      const options = {
        ...searchQry,
        ...pagOptns,
        attributes: [
          'id',
          'fullname',
          'username',
          'email',
          'phone_number',
          'last_login_ip',
          'last_login_date',
          'is_disabled',
          'created_at',
          'updated_at',
        ],
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: Roles, as: 'roles', through: { attributes: [] } },
        ],
      };

      const users = await User.findAndCountAll(options);

      util.setPagination(new Paginate(users, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', users.rows);

      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async registerUser(req, res) {
    const t = await sequelize.transaction();
    const payload = pick(req.body, [
      'email',
      'phone_number',
      'fullname',
      'department_id',
      'username',
      'role_id',
    ]);

    try {
      await validateUser().validateAsync(payload);
      const formattedPhoneNo = formatPhoneNumber(payload.phone_number);

      const { username, email, fullname, department_id, role_id } = payload;

      // get all if exist
      let [role, department] = await Promise.all([
        Roles.findOne({ where: { id: role_id } }),
        Department.findOne({ where: { id: department_id } }),
      ]);

      if (!department) throw new CustomError('Invalid department ID, department does not exist.');
      if (!role || role.code === 'ADMIN')
        throw new CustomError('Invalid Role Id: Role does not exist.');

      await checkUserExist(email);

      const tmpPassword = Generator.randomString(10);
      const hash = await UserService.hashPassword(tmpPassword);

      // log(tmpPassword);

      let user = await User.create(
        {
          email,
          fullname,
          password: hash,
          phone_number: formattedPhoneNo,
          department_id,
          username: username.toLowerCase(),
          last_login_ip: ip.address(),
        },
        { transaction: t }
      );

      await UserRoles.create({ user_id: user.id, role_id: role.id }, { transaction: t });
      await t.commit();

      role = await user.getRoles({ joinTableAttributes: [] });

      user = omit(user.toJSON(), ['password']); // remove hashed password

      if (!['test'].includes(env)) {
        await sendMailQueue.topic('sendLoginMail').publish({ user, password: tmpPassword });
      }

      util.setSuccess(200, 'successful', {
        ...user,
        roles: role,
        ...(['test'].includes(env) && { password: tmpPassword }),
      });

      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      await t.rollback();

      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async login(req, res) {
    try {
      const { user } = req;

      const response = {};

      const data = {
        id: user.id,
        email: user.email,
        role: user.roles,
        department: user.department,
      };

      response.access_token = AuthService.generateAccessToken(data);
      response.user = user.toJSON();

      delete response.user.password;
      delete response.user.reset_token;
      delete response.user.reset_expires;

      util.setSuccess(200, 'successful', response);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async getUserProfile(req, res) {
    const { user } = req;
    const { department } = user;

    try {
      let queryReq;

      switch (department.slug) {
        case 'LOAN_OFFICER':
        case 'TEAM_SUPERVISOR':
          queryReq = `
            SELECT 
              count(*) AS 'Total',
              sum(case when registration_status = 'pending' then 1 else 0 end) AS 'Pending',
              sum(case when registration_status = 'completed' then 1 else 0 end) AS 'Completed',
              sum(case when registration_status = 'update_required' then 1 else 0 end) AS 'Update Required'
            FROM loans
          `;
          break;

        case 'RISK_MANAGEMENT':
          queryReq = `
            SELECT count(*) AS 'On Desk', count(DISTINCT logs.loan_id) AS 'Total Review',
            coalesce(sum(case when logs.assign_to_id = ${user.id} then 1 else 0 end), 0) as 'Total Assigned' 
            FROM loans loan 
                INNER JOIN department dept ON loan.current_step_id = dept.id
                INNER JOIN loan_states states ON loan.current_state_id = states.id
                LEFT JOIN loan_logs logs ON loan.id = logs.loan_id
            WHERE dept.slug = 'RISK_MANAGEMENT'
          `;
          break;

        case 'OPERATION':
          queryReq = `
            SELECT count(*) AS 'Total',
              sum(case when dept.slug = 'OPERATION' AND states.slug != 'CLOSED' then 1 else 0 end) as 'Waiting for Disbursment',
              sum(case when dept.slug = 'OPERATION' AND states.slug = 'CLOSED' then 1 else 0 end) as 'Total Processed'	 
            FROM loans loan 
                INNER JOIN department dept ON loan.current_step_id = dept.id
                INNER JOIN loan_states states ON loan.current_state_id = states.id
            WHERE dept.slug = 'OPERATION'          
          `;
          break;

        // MANAGING_DIRECTOR
        default:
          queryReq = `
            SELECT count(*) AS 'On Desk', count(DISTINCT logs.loan_id) AS 'Total Review',
            coalesce(sum(case when logs.assign_to_id = ${user.id} then 1 else 0 end), 0) as 'Total Assigned'	 
            FROM loans loan 
                INNER JOIN department dept ON loan.current_step_id = dept.id
                INNER JOIN loan_states states ON loan.current_state_id = states.id
                LEFT JOIN loan_logs logs ON loan.id = logs.loan_id
            WHERE dept.slug = 'MANAGING_DIRECTOR'          
          `;
          break;
      }

      const analytics = await sequelize.query(queryReq, { type: QueryTypes.SELECT });

      const payload = await User.findOne({
        where: { id: user.id },
        attributes: [
          'id',
          'fullname',
          'email',
          'phone_number',
          'username',
          'last_login_ip',
          'last_login_date',
        ],
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

      const response = {
        ...payload.toJSON(),
        loan_analytics: analytics[0],
      };

      util.setSuccess(200, 'successful', response);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }
  /*
  static async getRoles(req, res) {
    const { page, limit } = req.query;

    const currentPage = parseInt(page || 1);
    const defaultLimit = parseInt(limit || 20);
    const pageOffset = (currentPage - 1) * defaultLimit;

    try {
      const roles = await Roles.findAndCountAll({
        limit: defaultLimit,
        offset: pageOffset,
        distinct: true,
        attributes: ['id', 'name', 'description'],
        include: [{ model: Permission, as: 'permissions', attributes: ['id', 'name'] }],
      });

      util.setSuccess(200, 'successful', roles);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async getRoleById(req, res) {
    const { role_id } = req.params;

    try {
      const roles = await Roles.findOne({
        where: { id: role_id },
        include: [{ model: Permission, as: 'permissions' }],
      });

      if (!roles) throw new Error(`Role with ID: ${role_id} not found!`);

      util.setSuccess(200, 'successful', roles);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }
*/

  static async addRoleToUser(req, res) {
    const payload = pick(req.body, ['user_id', 'roles']);

    try {
      await validateUserRole().validateAsync(payload);

      const user = await User.findOne({ where: { id: payload.user_id } });
      if (!user) throw new NotFound('User not found');

      await user.setRoles(payload.roles);

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async getUserById(req, res) {
    const { user_id } = req.params;

    try {
      const user = await User.findOne({
        where: { id: user_id },
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

      if (!user) throw new CustomError('Invalid User ID!');

      util.setSuccess(200, 'successful', new UserResponse(user));
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async updateUser(req, res) {
    const { user_id } = req.params;
    const payload = pick(req.body, [
      'fullname',
      'email',
      'username',
      'phone_number',
      'department_id',
    ]);

    try {
      // run validation
      await validateUpdateUser().validateAsync(payload);

      const user = await User.findOne({ where: { id: user_id } });
      if (!user) throw new CustomError(`User not found!`);

      await user.update({ ...payload });

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }
}
