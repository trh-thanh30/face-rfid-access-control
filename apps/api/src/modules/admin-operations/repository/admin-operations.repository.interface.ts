import type { ListAccessEventsQuery } from "@access/shared";

export const ADMIN_OPERATIONS_REPOSITORY = Symbol(
  "ADMIN_OPERATIONS_REPOSITORY",
);

export interface AdminOperationsRepository {
  dashboard(since: Date): Promise<{
    activePeople: number;
    activeDevices: Array<{
      id: string;
      deviceCode: string;
      lastSeenAt: Date | null;
    }>;
    allowedToday: number;
    deniedToday: number;
    recentEvents: AdminEventRecord[];
  }>;
  listEvents(query: ListAccessEventsQuery): Promise<{
    items: AdminEventRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  sessionTimeline(sessionId: string): Promise<AdminSessionTimeline | null>;
}

export type AdminEventRecord = {
  id: string;
  sessionId: string;
  eventType: "DECISION" | "ACTUATION" | "DEVICE";
  correlationId: string;
  result: string;
  reasonCode: string | null;
  similarity: number | null;
  latencyMs: number | null;
  metadata: unknown;
  occurredAt: Date;
  person: { id: string; code: string; fullName: string } | null;
  device: { id: string; deviceCode: string };
};

export type AdminSessionTimeline = {
  id: string;
  correlationId: string;
  status: string;
  reasonCode: string | null;
  createdAt: Date;
  expiresAt: Date;
  completedAt: Date | null;
  person: { id: string; code: string; fullName: string } | null;
  device: { id: string; deviceCode: string };
  command: {
    id: string;
    executionStatus: string;
    errorCode: string | null;
    expiresAt: Date;
    acknowledgedAt: Date | null;
  } | null;
  events: AdminEventRecord[];
};
