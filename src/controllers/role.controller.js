/* eslint-disable radix */
import { pick } from 'lodash';
import { Roles, Permission } from '../database/models';
import ValidationHelper from '../utils/ValidatorHelper';
import CustomError from '../utils/CustomError';
import RespUtil from '../utils/RespUtil';
import Utility from '../utils/Utility';
import Paginate from '../utils/Pagination';

const util = new RespUtil();
const { validateRole } = ValidationHelper;
const { newPagHandler } = Utility;

export default class RoleController {
  /**
   * method to create role
   */
  static async createRole(req, res) {
    const payload = pick(req.body, ['name', 'description']);

    try {
      const { error, value } = validateRole().validate(payload);
      if (error) throw new Error(error.message);

      const { name, description } = value;

      const role = await Roles.create({
        name: name.toUpperCase(),
        code: name.toUpperCase().replace(/ /g, '_'),
        description,
      });

      util.setSuccess(200, 'successful', role);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * static method to return all roles
   */
  static async getAllRoles(req, res) {
    const { page, limit } = req.query;

    const currentPage = parseInt(page) || 1;
    const defaultLimit = parseInt(limit) || 20;
    const pagOptns = newPagHandler(currentPage, defaultLimit, 'id');

    const queryBuilder = {
      ...pagOptns,
      distinct: true,
      attributes: ['id', 'name', 'description'],
      include: [{ model: Permission, as: 'permissions', attributes: ['id', 'name'] }],
    };

    try {
      const role = await Roles.findAndCountAll(queryBuilder);

      util.setPagination(new Paginate(role, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', role.rows);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * Get All permission
   */
  static async getAllPermissions(req, res) {
    try {
      const permission = await Permission.findAll();
      util.setSuccess(200, 'successful', permission);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * get single role by id
   */
  static async getSingleRole(req, res) {
    const { role_id } = req.params;

    try {
      const role = await Roles.findOne({
        where: { id: role_id },
        include: [{ model: Permission, as: 'permissions', attributes: ['id', 'name'] }],
      });

      if (!role) throw new Error(`Role with  ID: ${role_id} not found!`);

      util.setSuccess(200, 'successful', role);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * static method to update role
   */
  static async updateRole(req, res) {
    const { role_id } = req.params;

    try {
      const payload = pick(req.body, ['name', 'description']);

      const { error, value } = validateRole().validate(payload);
      if (error) throw new Error(error.message);

      const role = await Roles.findByPk(role_id);
      if (!role) throw new CustomError(`Role with id ${role_id} not found!`, 404);

      const { name, description } = value;

      const updatedRole = await role.update({
        name: name.toUpperCase(),
        code: name.toUpperCase().replace(/ /g, '_'),
        description,
      });

      util.setSuccess(200, 'successful', updatedRole);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * method to delete role
   */
  static async deleteRole(req, res) {
    const { role_id } = req.params;
    try {
      const role = await Roles.findByPk(role_id);
      if (!role) throw new CustomError(`Role with id ${role_id} not found!`, 404);

      const permission = await role.getUsers();

      if (permission.length === 0) {
        await role.destroy();
      } else {
        throw new Error('Role is attached to one or more users');
      }

      util.setSuccess(200, 'successful', null);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }
}
