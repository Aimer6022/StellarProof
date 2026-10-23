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
const webhookEvents = Object.values(VerificationWebhookEvent) as [
  VerificationWebhookEvent,
  ...VerificationWebhookEvent[],
];
const idParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'id must be a valid MongoDB ObjectId'),
});
const createWebhookSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.enum(webhookEvents)).min(1),
}).strict();
const updateWebhookSchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(z.enum(webhookEvents)).min(1).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one update field is required');
const deliveryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  skip: z.coerce.number().int().min(0).default(0),
});

function validateDeliveryQuery(req: Request, res: Response, next: NextFunction): void {
  const parsed = deliveryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid pagination parameters',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }
  res.locals.deliveryPagination = parsed.data;
  next();
}

router.post('/keys', generateApiKey);
router.post('/webhooks', protect, createWebhookRegistration);
router.get('/webhooks', protect, listWebhookRegistrations);
router.patch('/webhooks/:id', protect, updateWebhookRegistration);
router.delete('/webhooks/:id', protect, deleteWebhookRegistration);
router.post('/kms/backups', protect, createKmsBackup);
router.get('/kms/backups', protect, listKmsBackups);
router.post('/kms/backups/:id/restore', protect, restoreKmsBackup);

export default router;
