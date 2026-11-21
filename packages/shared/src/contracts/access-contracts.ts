import { z } from "zod";

export const AUTH_SESSION_STATUSES = [
  "PENDING",
  "VERIFYING",
  "ALLOWED",
  "DENIED",
  "EXPIRED",
] as const;

export const AUTH_SESSION_TERMINAL_STATUSES = [
  "ALLOWED",
  "DENIED",
  "EXPIRED",
] as const;

export const ACCESS_REASON_CODES = [
  "UNKNOWN_CARD",
  "CARD_DISABLED",
  "PERSON_DISABLED",
  "NO_PERMISSION",
  "OUTSIDE_ALLOWED_TIME",
  "NO_FACE_PROFILE",
  "CAMERA_BUSY",
  "NO_FACE",
  "MULTIPLE_FACES",
  "LOW_QUALITY",
  "FACE_MISMATCH",
  "SESSION_EXPIRED",
  "DEVICE_ERROR",
  "INTERNAL_ERROR",
] as const;

export const ACTUATION_STATUSES = [
  "PENDING",
  "APPLIED_UNCONFIRMED",
  "CONFIRMED",
  "FAILED",
  "UNKNOWN",
] as const;

export const authSessionStatusSchema = z.enum(AUTH_SESSION_STATUSES);
export const accessReasonCodeSchema = z.enum(ACCESS_REASON_CODES);
export const actuationStatusSchema = z.enum(ACTUATION_STATUSES);

export type AuthSessionStatus = z.infer<typeof authSessionStatusSchema>;
export type AccessReasonCode = z.infer<typeof accessReasonCodeSchema>;
export type ActuationStatus = z.infer<typeof actuationStatusSchema>;
