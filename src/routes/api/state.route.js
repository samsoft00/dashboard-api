import { Router } from 'express';
import StateController from '../../controllers/state.controller';

const router = Router();

router.get('/states', StateController.getAllStates);
router.get('/state/:state_id/cities', StateController.getCityByState);
router.get('/state/:state_id/lga', StateController.getLgaByState);
router.get('/state/:state_id/all', StateController.getCityAndLgaByState);

export default router;
