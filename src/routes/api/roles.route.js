import { Router } from 'express';
import RoleController from '../../controllers/role.controller';

import { isAuthenticated } from '../../middleware/auth.middleware';

const router = Router();

// Manage roles
router.post('/role', isAuthenticated, RoleController.createRole);
router.get('/roles', RoleController.getAllRoles);
router.get('/role/permissions', RoleController.getAllPermissions);
router.get('/role/:role_id', RoleController.getSingleRole);
router.put('/role/:role_id', isAuthenticated, RoleController.updateRole);
router.delete('/role/:role_id', isAuthenticated, RoleController.deleteRole);

export default router;
