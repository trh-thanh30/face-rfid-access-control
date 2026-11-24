import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export type AdminRole = "SUPER_ADMIN" | "ADMIN";
export const ADMIN_ROLES_KEY = "admin_roles";
export const RequireAdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<{
      admin?: { role: string };
    }>();
    if (!request.admin || !required.includes(request.admin.role as AdminRole)) {
      throw new ForbiddenException("ADMIN_ROLE_REQUIRED");
    }
    return true;
  }
}
