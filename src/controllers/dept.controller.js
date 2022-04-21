/* eslint-disable radix */
import { pick, isUndefined } from 'lodash';
import slugify from 'slugify';
import RespUtil from '../utils/RespUtil';
import Paginate from '../utils/Pagination';
import { Department, User, Roles } from '../database/models';
import ValidateHelper from '../utils/ValidatorHelper';
import Utility from '../utils/Utility';
import CustomError from '../utils/CustomError';

const util = new RespUtil();
const { validateDept } = ValidateHelper;
const { newPagHandler } = Utility;

/**
 * - createDept - Create new Department
 * - fetchAllDepts - Fetch all depts
 * - fetchDeptById - Fetch depts by ID
 * - updateDept - Update depts
 * - getStaffsByDeptId - Get all staffs using department ID
 */
export default class DeptController {
  static async createDept(req, res) {
    try {
      const payload = pick(req.body, ['name', 'description']);

      const { error, value } = validateDept().validate(payload);
      if (error) throw new Error(error.message);

      const name = value.name.toUpperCase();
      const slug = slugify(name);

      const dept = await Department.findOrCreate({
        where: { slug },
        defaults: { ...value, name, slug, loan_process_order: 0 },
      });

      util.setSuccess(200, 'successful', dept[0]);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async fetchAllDepts(req, res) {
    const { page, limit } = req.query;

    try {
      const currentPage = parseInt(page) || 1;
      const defaultLimit = parseInt(limit) || 20;
      const pagOptns = newPagHandler(currentPage, defaultLimit, 'id');

      const options = {
        ...pagOptns,
        attributes: ['id', 'name', 'description'],
      };

      const depts = await Department.findAndCountAll(options);

      util.setPagination(new Paginate(depts, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', depts.rows);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async fetchDeptById(req, res) {
    const { dept_id } = req.params;

    try {
      const dept = await Department.findOne({
        where: { id: dept_id },
        attributes: ['id', 'name', 'description'],
      });

      util.setSuccess(200, 'successful', dept);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async updateDept(req, res) {
    const { dept_id } = req.params;

    try {
      const payload = pick(req.body, ['name', 'description']);

      const { error, value } = validateDept().validate(payload);
      if (error) throw new Error(error.message);

      const dept = await Department.findOne({
        where: { id: dept_id },
        attributes: ['id', 'name', 'description'],
      });

      const updatedDept = await dept.update({ ...value });

      util.setSuccess(200, 'successful', updatedDept);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * API that allows us get users by department
   */
  static async getStaffsByDeptId(req, res) {
    const { page, limit } = req.query;
    const { dept_id } = req.params;

    try {
      const currentPage = parseInt(page) || 1;
      const defaultLimit = parseInt(limit) || 20;
      const pagOptns = newPagHandler(currentPage, defaultLimit, 'id');

      if (isUndefined(dept_id) || dept_id === 'undefined') {
        throw new CustomError('Kindly specify the department');
      }

      const options = {
        ...pagOptns,
        where: { department_id: dept_id },
        attributes: [
          'id',
          'username',
          'fullname',
          'email',
          'phone_number',
          'last_login_ip',
          'last_login_date',
        ],
        include: [{ model: Roles, as: 'roles', through: { attributes: [] } }],
      };

      const users = await User.findAndCountAll(options);

      util.setPagination(new Paginate(users, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', users.rows);

      return util.send(res);
    } catch (e) {
      return util.setError(e.statusCode || 400, e.message).send(res);
    }
  }

  static async deleteDepartment(req, res) {
    const { dept_id } = req.params;

    try {
      const dept = await Department.findByPk(dept_id);
      if (!dept) throw new CustomError(`Role with id ${dept_id} not found!`, 404);

      const users = await dept.getUsers();

      if (users.length === 0) {
        await dept.destroy();
      } else {
        throw new CustomError('Department is attached to one or more users');
      }

      util.setSuccess(200, 'successful', null);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }
}
