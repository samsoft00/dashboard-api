import { Router } from 'express';

import stateRoute from './state.route';
import deptRoute from './dept.route';
import loanAppRoute from './loan.route';
import educationRoute from './education.route';
import credequityRoute from './credequity.route';
import miscRoute from './misc.route';
import roleRoute from './roles.route';
import usersRoute from './users.route';
import sapRoute from './sap.route';
import fxRoute from './fx.route';
import bdcRoute from './bdc.route';
import applicantRoute from './applicant.route';
import webHook from './webhook.routes';

const routes = Router();

routes.use('/', deptRoute);
routes.use('/', stateRoute);
routes.use('/', applicantRoute);
routes.use('/', loanAppRoute);
routes.use('/', educationRoute);
routes.use('/', miscRoute);
routes.use('/', roleRoute);
routes.use('/', usersRoute);
routes.use('/', credequityRoute);
routes.use('/', sapRoute);
routes.use('/', fxRoute);
routes.use('/bdc', bdcRoute);
routes.use('/', webHook);

export default routes;
