import { z } from "zod";
import {
  accessReasonCodeSchema,
  actuationStatusSchema,
  authSessionStatusSchema,
} from "./access-contracts.ts";

const identifierSchema = z.string().trim().min(1).max(128);
const isoTimestampSchema = z.iso.datetime({ offset: true });

export const deviceCapabilitiesSchema = z
  .object({
    rfid: z.boolean(),
    actuator: z.enum(["SERVO", "RELAY", "VIRTUAL"]),
    doorSensor: z.boolean(),
    indicators: z.boolean(),
  })
  .strict();

export const deviceHeartbeatSchema = z
  .object({
    deviceCode: identifierSchema,
    timestamp: isoTimestampSchema,
    firmwareVersion: z.string().trim().min(1).max(64),
    uptimeSeconds: z.number().int().nonnegative(),
    rssi: z.number().int().min(-120).max(0).optional(),
    resetReason: z.string().trim().max(128).optional(),
    capabilities: deviceCapabilitiesSchema,
  })
  .strict();

export const createAccessSessionSchema = z
  .object({
    deviceCode: identifierSchema,
    requestId: identifierSchema,
    timestamp: isoTimestampSchema,
    rfidUid: z
      .string()
      .trim()
      .regex(/^[0-9A-Fa-f]{4,64}$/),
    firmwareVersion: z.string().trim().min(1).max(64),
  })
  .strict();

export const actuationCommandSchema = z
  .object({
    commandId: z.uuid(),
    sessionId: z.uuid(),
    deviceId: z.uuid(),
    expiresAt: isoTimestampSchema,
    openDurationMs: z.number().int().min(100).max(60_000),
  })
  .strict();

export const accessSessionResponseSchema = z
  .object({
    sessionId: z.uuid(),
    correlationId: z.uuid().optional(),
    status: authSessionStatusSchema,
    expiresAt: isoTimestampSchema,
    allowed: z.boolean().optional(),
    reasonCode: accessReasonCodeSchema.optional(),
    command: actuationCommandSchema.optional(),
  })
  .strict();

export const acknowledgeCommandSchema = z
  .object({
    commandId: z.uuid(),
    executionStatus: actuationStatusSchema.exclude(["PENDING"]),
    timestamp: isoTimestampSchema,
    errorCode: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

export type DeviceHeartbeat = z.infer<typeof deviceHeartbeatSchema>;
export type CreateAccessSession = z.infer<typeof createAccessSessionSchema>;
export type AccessSessionResponse = z.infer<typeof accessSessionResponseSchema>;
export type AcknowledgeCommand = z.infer<typeof acknowledgeCommandSchema>;
