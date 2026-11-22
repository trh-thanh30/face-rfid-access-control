import { Injectable } from "@nestjs/common";
import { Prisma, type AccessPoint, type Device } from "@prisma/client";
import type {
  DeviceHeartbeat,
  ListDevicesQuery,
  RegisterDeviceInput,
} from "@access/shared";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  AccessPointCodeConflictError,
  DeviceCodeConflictError,
  type AccessPointRecord,
  type DeviceCredentialRecord,
  type DeviceRecord,
  type DeviceRepository,
} from "./device.repository.interface";

@Injectable()
export class PrismaDeviceRepository implements DeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: RegisterDeviceInput & { tokenHash: string; now: Date },
  ): Promise<DeviceRecord> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const device = await transaction.device.create({
          data: {
            access_point_id: input.accessPointId,
            device_code: input.deviceCode,
            token_hash: input.tokenHash,
            credential_rotated_at: input.now,
          },
          include: { access_point: { select: { code: true } } },
        });
        await transaction.adminAuditEvent.create({
          data: {
            action: "DEVICE_REGISTERED",
            entity_type: "DEVICE",
            entity_id: device.id,
            metadata: {
              deviceCode: input.deviceCode,
              accessPointId: input.accessPointId,
            },
          },
        });
        return mapDevice(device);
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw new DeviceCodeConflictError();
      throw error;
    }
  }

  async findCredentialByCode(
    deviceCode: string,
  ): Promise<DeviceCredentialRecord | null> {
    const device = await this.prisma.device.findUnique({
      where: { device_code: deviceCode },
      include: { access_point: { select: { code: true } } },
    });
    return device
      ? { ...mapDevice(device), tokenHash: device.token_hash }
      : null;
  }

  async findById(id: string): Promise<DeviceRecord | null> {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { access_point: { select: { code: true } } },
    });
    return device ? mapDevice(device) : null;
  }

  async list(query: ListDevicesQuery) {
    const where: Prisma.DeviceWhereInput = {
      access_point_id: query.accessPointId,
      status: query.status,
    };
    const [devices, total] = await this.prisma.$transaction([
      this.prisma.device.findMany({
        where,
        include: { access_point: { select: { code: true } } },
        orderBy: [{ device_code: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.device.count({ where }),
    ]);
    return {
      items: devices.map(mapDevice),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async updateHeartbeat(
    deviceId: string,
    heartbeat: DeviceHeartbeat,
    receivedAt: Date,
  ): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        last_seen_at: receivedAt,
        device_reported_at: new Date(heartbeat.timestamp),
        firmware_version: heartbeat.firmwareVersion,
        uptime_seconds: heartbeat.uptimeSeconds,
        rssi: heartbeat.rssi ?? null,
        reset_reason: heartbeat.resetReason ?? null,
        capabilities: heartbeat.capabilities,
      },
    });
  }

  async rotateCredential(
    deviceId: string,
    tokenHash: string,
    now: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.device.updateMany({
        where: { id: deviceId },
        data: { token_hash: tokenHash, credential_rotated_at: now },
      });
      if (result.count === 0) return false;
      await transaction.adminAuditEvent.create({
        data: {
          action: "DEVICE_CREDENTIAL_ROTATED",
          entity_type: "DEVICE",
          entity_id: deviceId,
        },
      });
      return true;
    });
  }

  async disable(deviceId: string): Promise<DeviceRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.device.findUnique({
        where: { id: deviceId },
      });
      if (!current) return null;
      const device = await transaction.device.update({
        where: { id: deviceId },
        data: { status: "DISABLED" },
        include: { access_point: { select: { code: true } } },
      });
      await transaction.adminAuditEvent.create({
        data: {
          action: "DEVICE_DISABLED",
          entity_type: "DEVICE",
          entity_id: deviceId,
        },
      });
      return mapDevice(device);
    });
  }

  async sessionBelongsToDevice(
    sessionId: string,
    deviceId: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.authSession.count({
        where: { id: sessionId, device_id: deviceId },
      })) === 1
    );
  }

  async createAccessPoint(input: {
    code: string;
    name: string;
    location?: string;
    timezone: string;
  }): Promise<AccessPointRecord> {
    try {
      return mapAccessPoint(
        await this.prisma.accessPoint.create({
          data: {
            code: input.code,
            name: input.name,
            location: input.location,
            timezone: input.timezone,
          },
        }),
      );
    } catch (error) {
      if (isUniqueConflict(error)) throw new AccessPointCodeConflictError();
      throw error;
    }
  }

  async listAccessPoints(): Promise<AccessPointRecord[]> {
    const points = await this.prisma.accessPoint.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return points.map(mapAccessPoint);
  }

  async accessPointExists(id: string): Promise<boolean> {
    return (await this.prisma.accessPoint.count({ where: { id } })) === 1;
  }
}

type DeviceWithPoint = Device & { access_point?: { code: string } };

function mapDevice(device: DeviceWithPoint): DeviceRecord {
  return {
    id: device.id,
    accessPointId: device.access_point_id,
    accessPointCode: device.access_point?.code,
    deviceCode: device.device_code,
    status: device.status,
    firmwareVersion: device.firmware_version,
    capabilities: device.capabilities,
    lastSeenAt: device.last_seen_at,
    deviceReportedAt: device.device_reported_at,
    uptimeSeconds: device.uptime_seconds,
    rssi: device.rssi,
    resetReason: device.reset_reason,
    credentialRotatedAt: device.credential_rotated_at,
    createdAt: device.created_at,
    updatedAt: device.updated_at,
  };
}

function mapAccessPoint(point: AccessPoint): AccessPointRecord {
  return {
    id: point.id,
    code: point.code,
    name: point.name,
    location: point.location,
    timezone: point.timezone,
  };
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
