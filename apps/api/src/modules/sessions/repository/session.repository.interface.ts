import type {
  AccessReasonCode,
  ActuationStatus,
  AuthSessionStatus,
  CreateAccessSession,
} from "@access/shared";
import type { FaceVerificationResult } from "../face-verifier/face-verifier.port";

export const SESSION_REPOSITORY = Symbol("SESSION_REPOSITORY");

export type CommandRecord = {
  id: string;
  sessionId: string;
  deviceId: string;
  openDurationMs: number;
  expiresAt: Date;
  executionStatus: ActuationStatus;
  errorCode: string | null;
  acknowledgedAt: Date | null;
};

export type SessionRecord = {
  id: string;
  deviceId: string;
  requestId: string;
  correlationId: string;
  rfidCredentialId: string | null;
  personId: string | null;
  accessGrantId: string | null;
  status: AuthSessionStatus;
  reasonCode: AccessReasonCode | null;
  similarity: number | null;
  modelVersion: string | null;
  createdAt: Date;
  expiresAt: Date;
  completedAt: Date | null;
  command: CommandRecord | null;
};

export interface SessionRepository {
  createOrFind(input: {
    deviceId: string;
    request: CreateAccessSession;
    correlationId: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<{ session: SessionRecord; created: boolean }>;
  claimForVerification(sessionId: string, now: Date): Promise<boolean>;
  findById(sessionId: string): Promise<SessionRecord | null>;
  deny(input: {
    sessionId: string;
    reasonCode: AccessReasonCode;
    credentialId?: string;
    personId?: string;
    grantId?: string;
    evidence?: FaceVerificationResult;
    completedAt: Date;
  }): Promise<SessionRecord>;
  allow(input: {
    sessionId: string;
    credentialId: string;
    personId: string;
    grantId: string;
    evidence: FaceVerificationResult;
    completedAt: Date;
    commandExpiresAt: Date;
    openDurationMs: number;
  }): Promise<SessionRecord>;
  expire(sessionId: string, completedAt: Date): Promise<SessionRecord>;
  acknowledge(input: {
    sessionId: string;
    deviceId: string;
    commandId: string;
    executionStatus: Exclude<ActuationStatus, "PENDING">;
    errorCode?: string;
    deviceTimestamp: Date;
    receivedAt: Date;
  }): Promise<"ACCEPTED" | "DUPLICATE" | "NOT_FOUND" | "EXPIRED" | "CONFLICT">;
}
