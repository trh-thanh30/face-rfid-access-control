import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ListAccessEventsQuery } from "@access/shared";
import { PrismaService } from "../../../database/prisma/prisma.service";
import type {
  AdminEventRecord,
  AdminOperationsRepository,
  AdminSessionTimeline,
} from "./admin-operations.repository.interface";

const eventInclude = {
  person: { select: { id: true, code: true, full_name: true } },
  device: { select: { id: true, device_code: true } },
} satisfies Prisma.AccessEventInclude;

@Injectable()
export class PrismaAdminOperationsRepository implements AdminOperationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(since: Date) {
    const [activePeople, activeDevices, allowedToday, deniedToday, events] =
      await this.prisma.$transaction([
        this.prisma.person.count({ where: { status: "ACTIVE" } }),
        this.prisma.device.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, device_code: true, last_seen_at: true },
        }),
        this.prisma.accessEvent.count({
          where: {
            event_type: "DECISION",
            result: "ALLOWED",
            occurred_at: { gte: since },
          },
        }),
        this.prisma.accessEvent.count({
          where: {
            event_type: "DECISION",
            result: { in: ["DENIED", "EXPIRED"] },
            occurred_at: { gte: since },
          },
        }),
        this.prisma.accessEvent.findMany({
          include: eventInclude,
          orderBy: [{ occurred_at: "desc" }, { id: "desc" }],
          take: 8,
        }),
      ]);
    return {
      activePeople,
      activeDevices: activeDevices.map((device) => ({
        id: device.id,
        deviceCode: device.device_code,
        lastSeenAt: device.last_seen_at,
      })),
      allowedToday,
      deniedToday,
      recentEvents: events.map(mapEvent),
    };
  }

  async listEvents(query: ListAccessEventsQuery) {
    const where: Prisma.AccessEventWhereInput = {
      person_id: query.personId,
      device_id: query.deviceId,
      result: query.result,
      reason_code: query.reasonCode,
      occurred_at:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
    };
    const [events, total] = await this.prisma.$transaction([
      this.prisma.accessEvent.findMany({
        where,
        include: eventInclude,
        orderBy: [{ occurred_at: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.accessEvent.count({ where }),
    ]);
    return {
      items: events.map(mapEvent),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async sessionTimeline(
    sessionId: string,
  ): Promise<AdminSessionTimeline | null> {
    const session = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
      include: {
        person: { select: { id: true, code: true, full_name: true } },
        device: { select: { id: true, device_code: true } },
        command: true,
        access_events: {
          include: eventInclude,
          orderBy: [{ occurred_at: "asc" }, { id: "asc" }],
        },
      },
    });
    if (!session) return null;
    return {
      id: session.id,
      correlationId: session.correlation_id,
      status: session.status,
      reasonCode: session.reason_code,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      completedAt: session.completed_at,
      person: session.person
        ? {
            id: session.person.id,
            code: session.person.code,
            fullName: session.person.full_name,
          }
        : null,
      device: {
        id: session.device.id,
        deviceCode: session.device.device_code,
      },
      command: session.command
        ? {
            id: session.command.id,
            executionStatus: session.command.execution_status,
            errorCode: session.command.error_code,
            expiresAt: session.command.expires_at,
            acknowledgedAt: session.command.acknowledged_at,
          }
        : null,
      events: session.access_events.map(mapEvent),
    };
  }
}

function mapEvent(event: {
  id: string;
  session_id: string;
  event_type: "DECISION" | "ACTUATION" | "DEVICE";
  correlation_id: string;
  result: string;
  reason_code: string | null;
  similarity: number | null;
  latency_ms: number | null;
  metadata: unknown;
  occurred_at: Date;
  person: { id: string; code: string; full_name: string } | null;
  device: { id: string; device_code: string };
}): AdminEventRecord {
  return {
    id: event.id,
    sessionId: event.session_id,
    eventType: event.event_type,
    correlationId: event.correlation_id,
    result: event.result,
    reasonCode: event.reason_code,
    similarity: event.similarity,
    latencyMs: event.latency_ms,
    metadata: event.metadata,
    occurredAt: event.occurred_at,
    person: event.person
      ? {
          id: event.person.id,
          code: event.person.code,
          fullName: event.person.full_name,
        }
      : null,
    device: { id: event.device.id, deviceCode: event.device.device_code },
  };
}
