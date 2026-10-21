import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { generateApiKeyForUser } from '../services/developer.service';
import { createApp, registerWebhook, getAppDetails, listApps } from '../services/app.service';
import { AppError } from '../errors/AppError';
import { CreateAppDTO, RegisterWebhookDTO } from '../types/app.types';

/**
 * Generate API key for user
 * @route POST /api/v1/developer/keys
 */
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

/**
 * Create a new app for a developer
 * @route POST /api/v1/developer/apps
 */
export const createDeveloperApp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new AppError('Unauthorized. User ID required.', StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
    }

    const dto: CreateAppDTO = {
      name: req.body.name,
      description: req.body.description,
    };

    const app = await createApp(userId, dto);

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: app,
      message: 'App created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all apps for a developer
 * @route GET /api/v1/developer/apps
 */
export const listDeveloperApps = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new AppError('Unauthorized. User ID required.', StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
    }

    const apps = await listApps(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: apps,
      message: 'Apps retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get app details with webhooks
 * @route GET /api/v1/developer/apps/:appId
 */
export const getAppDetailsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const appId = req.params.appId;
    
    if (!userId) {
      throw new AppError('Unauthorized. User ID required.', StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
    }

    if (!appId) {
      throw new AppError('App ID is required', StatusCodes.BAD_REQUEST, 'MISSING_APP_ID');
    }

    const appDetails = await getAppDetails(userId, appId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: appDetails,
      message: 'App details retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a webhook for an app
 * @route POST /api/v1/developer/apps/:appId/webhooks
 * @returns Generated webhook with HMAC secret
 */
export const registerAppWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const appId = req.params.appId;
    
    if (!userId) {
      throw new AppError('Unauthorized. User ID required.', StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
    }

    if (!appId) {
      throw new AppError('App ID is required', StatusCodes.BAD_REQUEST, 'MISSING_APP_ID');
    }

    const dto: RegisterWebhookDTO = {
      url: req.body.url,
      events: req.body.events,
    };

    const webhook = await registerWebhook(userId, appId, dto);

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: webhook,
      message: 'Webhook registered successfully. Store the secret securely.',
    });
  } catch (error) {
    next(error);
  }
};
