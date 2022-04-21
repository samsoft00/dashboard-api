/* eslint-disable radix */
import { pick } from 'lodash';
import { Education } from '../database/models';
import RespUtil from '../utils/RespUtil';
import CustomError from '../utils/CustomError';
import ValidatorHelper from '../utils/ValidatorHelper';

const util = new RespUtil();

const { validateEdu } = ValidatorHelper;

export default class EducationController {
  static async createEdu(req, res) {
    try {
      const payload = pick(req.body, ['name']);

      const { error, value } = validateEdu().validate(payload);
      if (error) throw new Error(error.message);

      const education = await Education.findOrCreate({
        where: { name: payload.name },
        defaults: { ...value },
      });

      util.setSuccess(200, 'successful', education[0]);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async fetchAllEdu(req, res) {
    try {
      const options = {
        order: [['id', 'DESC']],
        attributes: ['id', 'name'],
      };

      const education = await Education.findAll(options);

      util.setSuccess(200, 'successful', education);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async fetchEduById(req, res) {
    const { edu_id } = req.params;

    try {
      const edu = await Education.findOne({ where: { id: edu_id } });

      util.setSuccess(200, 'successful', edu);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async updateEdu(req, res) {
    const { edu_id } = req.params;

    try {
      const payload = pick(req.body, ['name']);

      const { error, value } = validateEdu().validate(payload);
      if (error) throw new Error(error.message);

      const edu = await Education.findOne({ where: { id: edu_id } });

      const updatedEdu = await edu.update({ ...value });

      util.setSuccess(200, 'successful', updatedEdu);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async deleteEducation(req, res) {
    const { edu_id } = req.params;

    try {
      const edu = await Education.findByPk(edu_id);
      if (!edu) throw new CustomError(`Role with id ${edu_id} not found!`, 404);

      const users = await edu.getUsers();

      if (users.length === 0) {
        await edu.destroy();
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
