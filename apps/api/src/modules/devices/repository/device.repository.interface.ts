import type {
  DeviceHeartbeat,
  ListDevicesQuery,
  RegisterDeviceInput,
} from "@access/shared";

export const DEVICE_REPOSITORY = Symbol("DEVICE_REPOSITORY");

export type DeviceRecord = {
  id: string;
  accessPointId: string;
  accessPointCode?: string;
  deviceCode: string;
  status: "ACTIVE" | "DISABLED";
  firmwareVersion: string | null;
  capabilities: unknown;
  lastSeenAt: Date | null;
  deviceReportedAt: Date | null;
  uptimeSeconds: number | null;
  rssi: number | null;
  resetReason: string | null;
  credentialRotatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DeviceCredentialRecord = DeviceRecord & { tokenHash: string };

export type AccessPointRecord = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  timezone: string;
};

export interface DeviceRepository {
  create(
    input: RegisterDeviceInput & { tokenHash: string; now: Date },
  ): Promise<DeviceRecord>;
  findCredentialByCode(
    deviceCode: string,
  ): Promise<DeviceCredentialRecord | null>;
  findById(id: string): Promise<DeviceRecord | null>;
  list(query: ListDevicesQuery): Promise<{
    items: DeviceRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  updateHeartbeat(
    deviceId: string,
    heartbeat: DeviceHeartbeat,
    receivedAt: Date,
  ): Promise<void>;
  rotateCredential(
    deviceId: string,
    tokenHash: string,
    now: Date,
  ): Promise<boolean>;
  disable(deviceId: string): Promise<DeviceRecord | null>;
  sessionBelongsToDevice(sessionId: string, deviceId: string): Promise<boolean>;
  createAccessPoint(input: {
    code: string;
    name: string;
    location?: string;
    timezone: string;
  }): Promise<AccessPointRecord>;
  listAccessPoints(): Promise<AccessPointRecord[]>;
  accessPointExists(id: string): Promise<boolean>;
}

export class DeviceCodeConflictError extends Error {}
export class AccessPointCodeConflictError extends Error {}
