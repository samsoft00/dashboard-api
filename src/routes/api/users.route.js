import { Router } from 'express';
import UserController from '../../controllers/user.controller';
import AuthController from '../../controllers/auth.controller';

import {
  isAuthenticated,
  validateUserLogin,
  isLogin,
  isAdmin,
} from '../../middleware/auth.middleware';

const router = Router();

router.get('/users', isAuthenticated, UserController.getAllUser);

router.post('/user/login', [validateUserLogin, isLogin], UserController.login); // auth/login

router.post('/user/register', UserController.registerUser);

router.get('/user/me', isAuthenticated, UserController.getUserProfile);

/**
 * MANAGE USER ROLES
 * isAdmin
 */
router.post('/user/add-roles', [isAuthenticated, isAdmin], UserController.addRoleToUser);

router.get('/user/:user_id', [isAuthenticated, isAdmin], UserController.getUserById);

router.put('/user/:user_id', [isAuthenticated, isAdmin], UserController.updateUser);

/**
 * AUTHENTICATION ROUTES
 */

// change password
router.post('/auth/update-password', isAuthenticated, AuthController.changePassword);

// forgot password
router.post('/auth/reset-password', AuthController.generateResetPasswordLink);

router.post('/auth/validate-reset-password-token', AuthController.validateResetPasswordToken);

router.post('/auth/reset/:reset_token', AuthController.resetPassword);

export default router;
