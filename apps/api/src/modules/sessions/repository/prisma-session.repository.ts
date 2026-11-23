import { Injectable } from "@nestjs/common";
import {
  Prisma,
  type ActuationCommand,
  type AuthSession,
} from "@prisma/client";
import type {
  AccessReasonCode,
  ActuationStatus,
  AuthSessionStatus,
} from "@access/shared";
import { PrismaService } from "../../../database/prisma/prisma.service";
import type {
  CommandRecord,
  SessionRecord,
  SessionRepository,
} from "./session.repository.interface";

type SessionWithCommand = AuthSession & { command: ActuationCommand | null };

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOrFind(
    input: Parameters<SessionRepository["createOrFind"]>[0],
  ): Promise<{ session: SessionRecord; created: boolean }> {
    try {
      const session = await this.prisma.authSession.create({
        data: {
          device_id: input.deviceId,
          request_id: input.request.requestId,
          correlation_id: input.correlationId,
          device_reported_at: new Date(input.request.timestamp),
          firmware_version: input.request.firmwareVersion,
          created_at: input.createdAt,
          expires_at: input.expiresAt,
        },
        include: { command: true },
      });
      return { session: mapSession(session), created: true };
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const existing = await this.prisma.authSession.findUnique({
        where: {
          device_id_request_id: {
            device_id: input.deviceId,
            request_id: input.request.requestId,
          },
        },
        include: { command: true },
      });
      if (!existing) throw error;
      return { session: mapSession(existing), created: false };
    }
  }

  async claimForVerification(sessionId: string, now: Date): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({
      where: { id: sessionId, status: "PENDING", expires_at: { gt: now } },
      data: { status: "VERIFYING" },
    });
    return result.count === 1;
  }

  async findById(sessionId: string): Promise<SessionRecord | null> {
    const session = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
      include: { command: true },
    });
    return session ? mapSession(session) : null;
  }

  async deny(
    input: Parameters<SessionRepository["deny"]>[0],
  ): Promise<SessionRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.authSession.updateMany({
        where: { id: input.sessionId, status: "VERIFYING" },
        data: {
          status: "DENIED",
          reason_code: input.reasonCode,
          rfid_credential_id: input.credentialId,
          person_id: input.personId,
          access_grant_id: input.grantId,
          similarity: input.evidence?.similarity,
          model_version: input.evidence?.modelVersion,
          completed_at: input.completedAt,
        },
      });
      const session = await findSession(transaction, input.sessionId);
      if (updated.count === 1) {
        await transaction.accessEvent.create({
          data: {
            session_id: session.id,
            device_id: session.device_id,
            person_id: input.personId,
            event_type: "DECISION",
            correlation_id: session.correlation_id,
            deduplication_key: `DECISION:${session.id}`,
            result: "DENIED",
            reason_code: input.reasonCode,
            similarity: input.evidence?.similarity,
            latency_ms: input.evidence?.latencyMs,
            metadata: input.evidence
              ? {
                  modelVersion: input.evidence.modelVersion,
                  pipelineFingerprint: input.evidence.pipelineFingerprint,
                  validFrameCount: input.evidence.validFrameCount,
                }
              : undefined,
            occurred_at: input.completedAt,
          },
        });
      }
      return mapSession(session);
    });
  }

  async allow(
    input: Parameters<SessionRepository["allow"]>[0],
  ): Promise<SessionRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.authSession.updateMany({
        where: { id: input.sessionId, status: "VERIFYING" },
        data: {
          status: "ALLOWED",
          rfid_credential_id: input.credentialId,
          person_id: input.personId,
          access_grant_id: input.grantId,
          similarity: input.evidence.similarity,
          model_version: input.evidence.modelVersion,
          completed_at: input.completedAt,
        },
      });
      const session = await findSession(transaction, input.sessionId);
      if (updated.count === 1) {
        await transaction.actuationCommand.create({
          data: {
            session_id: session.id,
            device_id: session.device_id,
            open_duration_ms: input.openDurationMs,
            expires_at: input.commandExpiresAt,
          },
        });
        await transaction.accessEvent.create({
          data: {
            session_id: session.id,
            device_id: session.device_id,
            person_id: input.personId,
            event_type: "DECISION",
            correlation_id: session.correlation_id,
            deduplication_key: `DECISION:${session.id}`,
            result: "ALLOWED",
            similarity: input.evidence.similarity,
            latency_ms: input.evidence.latencyMs,
            metadata: {
              modelVersion: input.evidence.modelVersion,
              pipelineFingerprint: input.evidence.pipelineFingerprint,
              validFrameCount: input.evidence.validFrameCount,
              grantId: input.grantId,
            },
            occurred_at: input.completedAt,
          },
        });
      }
      return mapSession(await findSession(transaction, input.sessionId));
    });
  }

  async expire(sessionId: string, completedAt: Date): Promise<SessionRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.authSession.updateMany({
        where: { id: sessionId, status: { in: ["PENDING", "VERIFYING"] } },
        data: {
          status: "EXPIRED",
          reason_code: "SESSION_EXPIRED",
          completed_at: completedAt,
        },
      });
      const session = await findSession(transaction, sessionId);
      if (updated.count === 1) {
        await transaction.accessEvent.create({
          data: {
            session_id: session.id,
            device_id: session.device_id,
            person_id: session.person_id,
            event_type: "DECISION",
            correlation_id: session.correlation_id,
            deduplication_key: `DECISION:${session.id}`,
            result: "EXPIRED",
            reason_code: "SESSION_EXPIRED",
            occurred_at: completedAt,
          },
        });
      }
      return mapSession(session);
    });
  }

  async acknowledge(
    input: Parameters<SessionRepository["acknowledge"]>[0],
  ): Promise<"ACCEPTED" | "DUPLICATE" | "NOT_FOUND" | "EXPIRED" | "CONFLICT"> {
    return this.prisma.$transaction(async (transaction) => {
      const command = await transaction.actuationCommand.findFirst({
        where: {
          id: input.commandId,
          session_id: input.sessionId,
          device_id: input.deviceId,
          session: { status: "ALLOWED" },
        },
        include: { session: true },
      });
      if (!command) return "NOT_FOUND";
      if (command.expires_at < input.receivedAt) return "EXPIRED";
      if (command.acknowledged_at) {
        return command.execution_status === input.executionStatus &&
          command.error_code === (input.errorCode ?? null)
          ? "DUPLICATE"
          : "CONFLICT";
      }
      const claimed = await transaction.actuationCommand.updateMany({
        where: { id: command.id, acknowledged_at: null },
        data: {
          execution_status: input.executionStatus,
          error_code: input.errorCode,
          acknowledged_at: input.receivedAt,
          device_acknowledged_at: input.deviceTimestamp,
        },
      });
      if (claimed.count === 0) return "DUPLICATE";
      await transaction.accessEvent.create({
        data: {
          session_id: command.session_id,
          device_id: command.device_id,
          person_id: command.session.person_id,
          event_type: "ACTUATION",
          correlation_id: command.session.correlation_id,
          deduplication_key: `ACTUATION:${command.id}`,
          result: input.executionStatus,
          reason_code: input.errorCode,
          metadata: { commandId: command.id },
          occurred_at: input.receivedAt,
        },
      });
      return "ACCEPTED";
    });
  }
}

async function findSession(
  transaction: Prisma.TransactionClient,
  sessionId: string,
): Promise<SessionWithCommand> {
  return transaction.authSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { command: true },
  });
}

function mapSession(session: SessionWithCommand): SessionRecord {
  return {
    id: session.id,
    deviceId: session.device_id,
    requestId: session.request_id,
    correlationId: session.correlation_id,
    rfidCredentialId: session.rfid_credential_id,
    personId: session.person_id,
    accessGrantId: session.access_grant_id,
    status: session.status as AuthSessionStatus,
    reasonCode: session.reason_code as AccessReasonCode | null,
    similarity: session.similarity,
    modelVersion: session.model_version,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
    completedAt: session.completed_at,
    command: session.command ? mapCommand(session.command) : null,
  };
}

function mapCommand(command: ActuationCommand): CommandRecord {
  return {
    id: command.id,
    sessionId: command.session_id,
    deviceId: command.device_id,
    openDurationMs: command.open_duration_ms,
    expiresAt: command.expires_at,
    executionStatus: command.execution_status as ActuationStatus,
    errorCode: command.error_code,
    acknowledgedAt: command.acknowledged_at,
  };
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
