export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type Person = {
  id: string;
  code: string;
  fullName: string;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
};
export type Credential = {
  id: string;
  personId: string;
  displayHint: string | null;
  status: "ACTIVE" | "REVOKED";
  issuedAt: string;
  revokedAt: string | null;
};
export type Grant = {
  id: string;
  personId: string;
  accessPointId: string;
  validFrom: string;
  validUntil: string;
  timeFrom: string;
  timeUntil: string;
  timezone: string;
  status: "ACTIVE" | "REVOKED";
};
export type AccessPoint = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  timezone: string;
};
export type Device = {
  id: string;
  deviceCode: string;
  accessPointCode?: string;
  status: "ACTIVE" | "DISABLED";
  online: boolean;
  firmwareVersion: string | null;
  lastSeenAt: string | null;
  rssi: number | null;
  resetReason: string | null;
};
export type AccessEvent = {
  id: string;
  sessionId: string;
  eventType: "DECISION" | "ACTUATION" | "DEVICE";
  correlationId: string;
  result: string;
  reasonCode: string | null;
  similarity: number | null;
  latencyMs: number | null;
  occurredAt: string;
  person: { id: string; code: string; fullName: string } | null;
  device: { id: string; deviceCode: string };
};
