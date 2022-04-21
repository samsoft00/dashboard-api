import { Router } from 'express';
import pkg from '../../../package.json';

const welcomeRoute = Router();

welcomeRoute.get('/', async (req, res) => {
  return res.status(200).json({
    success: true,
    message: `CPG Dashboard API v${pkg.version}`,
  });
});

export default welcomeRoute;
