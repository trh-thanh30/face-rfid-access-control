import { randomBytes } from "node:crypto";
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  CreateAccessPointInput,
  DeviceHeartbeat,
  ListDevicesQuery,
  RegisterDeviceInput,
} from "@access/shared";
import * as bcrypt from "bcryptjs";
import { CLOCK_PORT, type ClockPort } from "../../../common/clock/clock.port";
import {
  AccessPointCodeConflictError,
  DEVICE_REPOSITORY,
  DeviceCodeConflictError,
  type DeviceRecord,
  type DeviceRepository,
} from "../repository/device.repository.interface";

export type DevicePrincipal = {
  id: string;
  deviceCode: string;
  accessPointId: string;
};

@Injectable()
export class DeviceAuthenticationService {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
  ) {}

  async authenticate(
    deviceCode: string,
    token: string,
  ): Promise<DevicePrincipal> {
    const device = await this.devices.findCredentialByCode(deviceCode);
    const valid = device
      ? await bcrypt.compare(token, device.tokenHash)
      : false;
    if (!device || device.status !== "ACTIVE" || !valid) {
      throw new UnauthorizedException("DEVICE_AUTHENTICATION_FAILED");
    }
    return {
      id: device.id,
      deviceCode: device.deviceCode,
      accessPointId: device.accessPointId,
    };
  }
}

@Injectable()
export class DevicePresencePolicy {
  private readonly thresholdMs: number;

  constructor(
    config: ConfigService,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {
    this.thresholdMs =
      config.get<number>("DEVICE_OFFLINE_THRESHOLD_SECONDS", 30) * 1000;
  }

  isOnline(lastSeenAt: Date | null): boolean {
    if (!lastSeenAt) return false;
    const age = this.clock.now().getTime() - lastSeenAt.getTime();
    return age >= 0 && age <= this.thresholdMs;
  }

  withPresence(device: DeviceRecord) {
    return {
      ...device,
      online: device.status === "ACTIVE" && this.isOnline(device.lastSeenAt),
    };
  }
}

@Injectable()
export class RegisterDeviceUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(input: RegisterDeviceInput) {
    if (!(await this.devices.accessPointExists(input.accessPointId))) {
      throw new NotFoundException("ACCESS_POINT_NOT_FOUND");
    }
    const token = randomBytes(32).toString("base64url");
    const tokenHash = await bcrypt.hash(token, 12);
    try {
      const device = await this.devices.create({
        ...input,
        tokenHash,
        now: this.clock.now(),
      });
      return { device, credential: { token, issuedOnce: true } };
    } catch (error) {
      if (error instanceof DeviceCodeConflictError) {
        throw new ConflictException("DEVICE_CODE_ALREADY_EXISTS");
      }
      throw error;
    }
  }
}

@Injectable()
export class RotateDeviceCredentialUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}
  async execute(deviceId: string) {
    const token = randomBytes(32).toString("base64url");
    const updated = await this.devices.rotateCredential(
      deviceId,
      await bcrypt.hash(token, 12),
      this.clock.now(),
    );
    if (!updated) throw new NotFoundException("DEVICE_NOT_FOUND");
    return { deviceId, credential: { token, issuedOnce: true } };
  }
}

@Injectable()
export class DisableDeviceUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
    private readonly presence: DevicePresencePolicy,
  ) {}
  async execute(deviceId: string) {
    const device = await this.devices.disable(deviceId);
    if (!device) throw new NotFoundException("DEVICE_NOT_FOUND");
    return this.presence.withPresence(device);
  }
}

@Injectable()
export class GetDeviceUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
    private readonly presence: DevicePresencePolicy,
  ) {}
  async execute(deviceId: string) {
    const device = await this.devices.findById(deviceId);
    if (!device) throw new NotFoundException("DEVICE_NOT_FOUND");
    return this.presence.withPresence(device);
  }
}

@Injectable()
export class ListDevicesUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
    private readonly presence: DevicePresencePolicy,
  ) {}
  async execute(query: ListDevicesQuery) {
    const result = await this.devices.list(query);
    return {
      ...result,
      items: result.items.map((item) => this.presence.withPresence(item)),
    };
  }
}

@Injectable()
export class RecordHeartbeatUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}
  async execute(
    principal: DevicePrincipal,
    heartbeat: DeviceHeartbeat,
  ): Promise<void> {
    if (heartbeat.deviceCode !== principal.deviceCode) {
      throw new UnauthorizedException("DEVICE_IDENTITY_MISMATCH");
    }
    await this.devices.updateHeartbeat(
      principal.id,
      heartbeat,
      this.clock.now(),
    );
  }
}

@Injectable()
export class CreateAccessPointUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
  ) {}
  async execute(input: CreateAccessPointInput) {
    try {
      return await this.devices.createAccessPoint(input);
    } catch (error) {
      if (error instanceof AccessPointCodeConflictError) {
        throw new ConflictException("ACCESS_POINT_CODE_ALREADY_EXISTS");
      }
      throw error;
    }
  }
}

@Injectable()
export class ListAccessPointsUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
  ) {}
  execute() {
    return this.devices.listAccessPoints();
  }
}
