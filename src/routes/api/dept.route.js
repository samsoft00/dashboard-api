import { Router } from 'express';
import DeptController from '../../controllers/dept.controller';

const router = Router();

router.get('/departments', DeptController.fetchAllDepts);
router.post('/department', DeptController.createDept);
router.get('/department/:dept_id', DeptController.fetchDeptById);
router.put('/department/:dept_id', DeptController.updateDept);
router.delete('/department/:dept_id', DeptController.deleteDepartment);
router.get('/department/:dept_id/staffs', DeptController.getStaffsByDeptId);

export default router;
