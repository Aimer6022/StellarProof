import crypto from "crypto";
import mongoose from "mongoose";
import { AppError } from "../errors/AppError";
import WebhookRegistration, { type IWebhookRegistration } from "../models/WebhookRegistration.model";
import { VerificationWebhookEvent } from "../types/verification.types";
import type { WebhookEventType } from "../types/webhook.types";
import { encryptWebhookSecret } from "../utils/webhookSecrets";

export interface CreateWebhookRegistrationInput {
  url: string;
  events: WebhookEventType[];
}

export interface UpdateWebhookRegistrationInput {
  url?: string;
  events?: WebhookEventType[];
  isActive?: boolean;
}

function parseId(id: string, label: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError(`Invalid ${label}`, 400, "INVALID_ID");
  return new mongoose.Types.ObjectId(id);
}

function validateUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new AppError("A valid webhook URL is required", 400, "INVALID_WEBHOOK_URL");
  }
  if (!(["https:", "http:"].includes(parsed.protocol)) || parsed.username || parsed.password || !parsed.hostname) {
    throw new AppError("Webhook URL must use HTTP or HTTPS and cannot include credentials", 400, "INVALID_WEBHOOK_URL");
  }
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new AppError("Webhook URL must use HTTPS in production", 400, "INVALID_WEBHOOK_URL");
  }
  return parsed.toString();
}

function validateEvents(events: WebhookEventType[]): WebhookEventType[] {
  const allowed = new Set<string>(Object.values(VerificationWebhookEvent));
  if (!Array.isArray(events) || events.length === 0 || events.some((event) => !allowed.has(event))) {
    throw new AppError("At least one supported webhook event is required", 400, "INVALID_WEBHOOK_EVENTS");
  }
  return [...new Set(events)];
}

export class WebhookRegistrationService {
  async create(
    ownerId: string,
    input: CreateWebhookRegistrationInput
  ): Promise<{ registration: IWebhookRegistration; secret: string }> {
    const ownerObjectId = parseId(ownerId, "owner ID");
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new AppError("Webhook registration details are required", 400, "INVALID_WEBHOOK_REGISTRATION");
    }
    const url = validateUrl(input.url);
    const events = validateEvents(input.events);
    if (await WebhookRegistration.exists({ ownerId: ownerObjectId, url })) {
      throw new AppError("A webhook for this URL is already registered", 409, "WEBHOOK_ALREADY_EXISTS");
    }

    const secret = crypto.randomBytes(32).toString("hex");
    const registration = new WebhookRegistration({ ownerId: ownerObjectId, url, events, isActive: true });
    registration.secretEncrypted = encryptWebhookSecret(secret, ownerId, String(registration._id));
    await registration.save();
    return { registration, secret };
  }

  list(ownerId: string): Promise<IWebhookRegistration[]> {
    return WebhookRegistration.find({ ownerId: parseId(ownerId, "owner ID") }).sort({ createdAt: -1 }).exec();
  }

  async update(
    ownerId: string,
    registrationId: string,
    input: UpdateWebhookRegistrationInput
  ): Promise<IWebhookRegistration> {
    const ownerObjectId = parseId(ownerId, "owner ID");
    const id = parseId(registrationId, "webhook registration ID");
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new AppError("Webhook update details are required", 400, "INVALID_WEBHOOK_UPDATE");
    }
    const update: Partial<Pick<IWebhookRegistration, "url" | "events" | "isActive">> = {};
    if (input.url !== undefined) update.url = validateUrl(input.url);
    if (input.events !== undefined) update.events = validateEvents(input.events);
    if (input.isActive !== undefined) update.isActive = input.isActive;
    if (Object.keys(update).length === 0) {
      throw new AppError("At least one update field is required", 400, "EMPTY_WEBHOOK_UPDATE");
    }

    if (update.url && await WebhookRegistration.exists({ ownerId: ownerObjectId, url: update.url, _id: { $ne: id } })) {
      throw new AppError("A webhook for this URL is already registered", 409, "WEBHOOK_ALREADY_EXISTS");
    }
    const registration = await WebhookRegistration.findOneAndUpdate(
      { _id: id, ownerId: ownerObjectId },
      { $set: update },
      { new: true, runValidators: true }
    ).exec();
    if (!registration) throw new AppError("Webhook registration not found", 404, "WEBHOOK_NOT_FOUND");
    return registration;
  }

  async remove(ownerId: string, registrationId: string): Promise<void> {
    const result = await WebhookRegistration.deleteOne({
      _id: parseId(registrationId, "webhook registration ID"),
      ownerId: parseId(ownerId, "owner ID"),
    }).exec();
    if (result.deletedCount === 0) throw new AppError("Webhook registration not found", 404, "WEBHOOK_NOT_FOUND");
  }
}

export const webhookRegistrationService = new WebhookRegistrationService();
