import type { NextFunction, Request, Response } from 'express';
import { generateApiKeyForUser } from '../services/developer.service';
import { webhookRegistrationService, WebhookRegistrationError } from '../services/webhookRegistration.service';
import type { NextFunction } from 'express';

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

function authenticatedOwnerId(req: Request): string {
  if (!req.user) throw new WebhookRegistrationError('Authentication required', 401);
  return String(req.user._id);
}

export const createWebhookRegistration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const { registration, secret } = await webhookRegistrationService.create(authenticatedOwnerId(req), body);
    res.status(201).json({
      success: true,
      data: {
        id: registration.id,
        url: registration.url,
        events: registration.events,
        isActive: registration.isActive,
        secret,
        createdAt: registration.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listWebhookRegistrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const registrations = await webhookRegistrationService.list(authenticatedOwnerId(req));
    res.status(200).json({
      success: true,
      data: registrations.map(({ id, url, events, isActive, createdAt, updatedAt }) => ({
        id, url, events, isActive, createdAt, updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const updateWebhookRegistration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const registration = await webhookRegistrationService.update(
      authenticatedOwnerId(req), req.params.id,
      { url: body.url, events: body.events, isActive: body.isActive }
    );
    res.status(200).json({
      success: true,
      data: {
        id: registration.id,
        url: registration.url,
        events: registration.events,
        isActive: registration.isActive,
        updatedAt: registration.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWebhookRegistration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await webhookRegistrationService.remove(authenticatedOwnerId(req), req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
