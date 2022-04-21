import request from 'request';
import { pick } from 'lodash';
import RespUtil from '../utils/RespUtil';
import Generator from '../utils/Generator';
import ValidateHelper from '../utils/ValidatorHelper';

const { validateSap } = ValidateHelper;
const util = new RespUtil();

const FRONT_END_PATH = 'https://api-sap-frontend.cpfs.online/user/register';

/**
 * SAP Controller
 */
export default class SapController {
  static sendPortalLogin(req, res) {
    try {
      const payload = pick(req.body, ['email', 'phone_number', 'fullname']);

      const { error, value } = validateSap.validate(payload);
      if (error) throw new Error(error.message);

      const password = Generator.randomString(6);

      const { email, phone_number, fullname } = value;
      const baseRequest = request.defaults({ jar: true });
      baseRequest(
        {
          url: FRONT_END_PATH,
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          json: {
            email,
            phonenumber: phone_number,
            fullname,
            password,
          },
        },
        (err, resp, body) => {
          if (err) throw new Error(`Couldn't create client on core banking: ${err}`);

          util.setSuccess(200, 'successful', body);
          return util.send(res);
        }
      );
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }
}
