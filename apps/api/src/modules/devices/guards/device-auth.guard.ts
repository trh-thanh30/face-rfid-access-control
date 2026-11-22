import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  DeviceAuthenticationService,
  type DevicePrincipal,
} from "../use-cases/device.use-cases";

export type DeviceRequest = {
  headers: Record<string, string | string[] | undefined>;
  params: Record<string, string | undefined>;
  device?: DevicePrincipal;
};

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly authentication: DeviceAuthenticationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<DeviceRequest>();
    const deviceCode = firstHeader(request.headers["x-device-code"]);
    const authorization = firstHeader(request.headers.authorization);
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!deviceCode || !token) {
      throw new UnauthorizedException("DEVICE_AUTHENTICATION_FAILED");
    }
    request.device = await this.authentication.authenticate(deviceCode, token);
    return true;
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
