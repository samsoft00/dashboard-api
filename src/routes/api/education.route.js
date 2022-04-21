import { Router } from 'express';
import EducationCtrl from '../../controllers/education.controller';

const router = Router();

router.post('/education', EducationCtrl.createEdu);
router.get('/education', EducationCtrl.fetchAllEdu);
router.get('/education/:edu_id', EducationCtrl.fetchEduById);
router.put('/education/:edu_id', EducationCtrl.updateEdu);
router.delete('/education/:edu_id', EducationCtrl.deleteEducation);

export default router;
