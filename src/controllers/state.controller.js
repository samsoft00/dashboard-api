import RespUtil from '../utils/RespUtil';
import { State, City, Lga } from '../database/models';

const util = new RespUtil();

export default class StateController {
  // get states
  static async getAllStates(req, res) {
    try {
      const states = await State.findAll({ attributes: ['id', 'name'] });

      util.setSuccess(200, 'successful', states);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  // get state by id
  static async getCityByState(req, res) {
    const { state_id } = req.params;

    try {
      if (!state_id) throw new Error('Please provide State ID');

      const state = await State.findOne({
        where: { id: state_id },
        attributes: ['id', 'name'],
        include: [
          {
            model: City,
            as: 'cities',
            attributes: ['id', 'name'],
          },
        ],
      });

      util.setSuccess(200, 'successful', state);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  // get lga by state
  static async getLgaByState(req, res) {
    const { state_id } = req.params;

    try {
      if (!state_id) throw new Error('Please provide State ID');

      const state = await State.findOne({
        where: { id: state_id },
        attributes: ['id', 'name'],
        include: [
          {
            model: Lga,
            as: 'lga',
            attributes: ['id', 'name'],
          },
        ],
      });

      util.setSuccess(200, 'successful', state);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  // load city and lga by state
  static async getCityAndLgaByState(req, res) {
    const { state_id } = req.params;

    try {
      if (!state_id) throw new Error('Please provide State ID');

      const state = await State.findOne({
        where: { id: state_id },
        attributes: ['id', 'name'],
        include: [
          {
            model: City,
            as: 'cities',
            attributes: ['id', 'name'],
          },
          {
            model: Lga,
            as: 'lga',
            attributes: ['id', 'name'],
          },
        ],
      });

      util.setSuccess(200, 'successful', state);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }
}
