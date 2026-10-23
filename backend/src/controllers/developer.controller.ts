import type { NextFunction, Request, Response } from 'express';
import { generateApiKeyForUser } from '../services/developer.service';
import { webhookRegistrationService } from '../services/webhookRegistration.service';
import { webhookDeliveryService } from '../services/webhookDelivery.service';
import type {
  CreateWebhookRegistrationInput,
  UpdateWebhookRegistrationInput,
} from '../services/webhookRegistration.service';
import type { IWebhookRegistration } from '../models/WebhookRegistration.model';
import { AppError } from '../errors/AppError';

function requesterId(req: Request): string {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return String(req.user._id);
}

function registrationResponse(registration: IWebhookRegistration) {
  return {
    id: String(registration._id),
    url: registration.url,
    events: registration.events,
    isActive: registration.isActive,
    createdAt: registration.createdAt,
    updatedAt: registration.updatedAt,
  };
}

export const createWebhookRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await webhookRegistrationService.create(
      requesterId(req),
      req.body as CreateWebhookRegistrationInput
    );
    res.status(201).json({
      success: true,
      data: { ...registrationResponse(result.registration), secret: result.secret },
    });
  } catch (error) {
    next(error);
  }
};

export const listWebhookRegistrations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const registrations = await webhookRegistrationService.list(requesterId(req));
    res.status(200).json({ success: true, data: registrations.map(registrationResponse) });
  } catch (error) {
    next(error);
  }
};

export const updateWebhookRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const registration = await webhookRegistrationService.update(
      requesterId(req),
      req.params.id,
      req.body as UpdateWebhookRegistrationInput
    );
    res.status(200).json({ success: true, data: registrationResponse(registration) });
  } catch (error) {
    next(error);
  }
};

export const deleteWebhookRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await webhookRegistrationService.remove(requesterId(req), req.params.id);
    res.status(200).json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (error) {
    next(error);
  }
};

export const listWebhookDeliveries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { limit, skip } = res.locals.deliveryPagination as { limit: number; skip: number };
    const result = await webhookDeliveryService.listForRegistration(
      requesterId(req), req.params.id, limit, skip
    );
    res.status(200).json({
      success: true,
      data: result.deliveries,
      total: result.total,
      limit,
      skip,
    });
  } catch (error) {
    next(error);
  }
};

export const generateApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized. User ID required.' });
      return;
    }

    const plainTextApiKey = await generateApiKeyForUser(userId);
    
    res.status(201).json({
      success: true,
      message: 'API key generated successfully.',
      key: plainTextApiKey
    });
  } catch (error: any) {
    console.error('[API Key Error]', error);
    if (error.message === 'User not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
