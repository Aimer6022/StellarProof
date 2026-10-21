import { Router } from 'express';
import { generateApiKey, createDeveloperApp, listDeveloperApps, getAppDetailsController, registerAppWebhook } from '../controllers/developer.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { zodBody } from '../middlewares/zodValidate';
import { zodParams } from '../middlewares/zodValidateParams';
import { createAppSchema, registerWebhookSchema, appIdSchema } from '../middlewares/app.validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(protect);
router.use(restrictTo('developer', 'admin'));

// API Key management
router.post('/keys', generateApiKey);

// App management
router.post('/apps', zodBody(createAppSchema), createDeveloperApp);
router.get('/apps', listDeveloperApps);
router.get('/apps/:appId', zodParams(appIdSchema), getAppDetailsController);

// Webhook registration
router.post(
  '/apps/:appId/webhooks',
  zodParams(appIdSchema),
  zodBody(registerWebhookSchema),
  registerAppWebhook
);

export default router;
