import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from "@nestjs/common";
import { isContractVersionCompatible } from "@access/shared";
import type { DeviceRequest } from "./device-auth.guard";

@Injectable()
export class ContractVersionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<DeviceRequest>();
    const raw = request.headers["x-access-contract-version"];
    const version = Array.isArray(raw) ? raw[0] : raw;
    if (!version || !isContractVersionCompatible(version)) {
      throw new HttpException("CONTRACT_VERSION_UNSUPPORTED", 426);
    }
    return true;
  }
}
