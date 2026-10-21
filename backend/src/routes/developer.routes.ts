import { Router } from 'express';
import {
  createWebhookRegistration,
  deleteWebhookRegistration,
  generateApiKey,
  listWebhookRegistrations,
  updateWebhookRegistration,
} from '../controllers/developer.controller';
import { protect } from '../middlewares/auth.middleware';
import { createKmsBackup, listKmsBackups, restoreKmsBackup } from '../controllers/kmsBackup.controller';

const router = Router();

router.post('/keys', generateApiKey);
router.post('/webhooks', protect, createWebhookRegistration);
router.get('/webhooks', protect, listWebhookRegistrations);
router.patch('/webhooks/:id', protect, updateWebhookRegistration);
router.delete('/webhooks/:id', protect, deleteWebhookRegistration);
router.post('/kms/backups', protect, createKmsBackup);
router.get('/kms/backups', protect, listKmsBackups);
router.post('/kms/backups/:id/restore', protect, restoreKmsBackup);

export default router;
