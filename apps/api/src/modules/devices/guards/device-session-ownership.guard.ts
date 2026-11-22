import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  DEVICE_REPOSITORY,
  type DeviceRepository,
} from "../repository/device.repository.interface";
import { Inject } from "@nestjs/common";
import type { DeviceRequest } from "./device-auth.guard";

@Injectable()
export class DeviceSessionOwnershipGuard implements CanActivate {
  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<DeviceRequest>();
    const sessionId = request.params.sessionId;
    if (
      !request.device ||
      !sessionId ||
      !(await this.devices.sessionBelongsToDevice(sessionId, request.device.id))
    ) {
      throw new ForbiddenException("DEVICE_SESSION_OWNERSHIP_REQUIRED");
    }
    return true;
  }
}
