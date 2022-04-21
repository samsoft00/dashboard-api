import { Router } from 'express';

import welcomeRoute from './api/welcome.route';
import apiV1 from './api';

const routes = Router();

routes.use('/', welcomeRoute);
routes.use('/api/v1', apiV1);

export default routes;
