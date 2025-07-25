import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { GoogleAuthController } from '../controllers/GoogleAuthController';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import {
  registerValidator,
  loginValidator,
  profileUpdateValidator,
  passwordChangeValidator,
  apiKeyValidator,
  apiKeyIdValidator,
} from '../validators/authValidators';

const router = express.Router();

// Public routes
router.post('/register', validate(registerValidator), AuthController.register);
router.post('/login', validate(loginValidator), AuthController.login);
router.post('/google', GoogleAuthController.googleCallback);

// Protected routes
router.use(authenticateJWT);
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.getCurrentUser);
router.put('/profile', validate(profileUpdateValidator), AuthController.updateProfile);
router.post('/change-password', validate(passwordChangeValidator), AuthController.changePassword);
router.post('/api-keys', validate(apiKeyValidator), AuthController.generateApiKey);
router.get('/api-keys', AuthController.getApiKeys);
router.put('/api-keys/:keyId/revoke', validate(apiKeyIdValidator), AuthController.revokeApiKey);
router.delete('/api-keys/:keyId', validate(apiKeyIdValidator), AuthController.deleteApiKey);

export default router;