import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ADMIN_ACCOUNT_REPOSITORY,
  type AdminAccountRepository,
} from "../repository/admin-account.repository.interface";

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ADMIN_ACCOUNT_REPOSITORY)
    private readonly accounts: AdminAccountRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      admin?: { id: string; email: string; role: string };
    }>();
    const authorization = request.headers.authorization;
    const value = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    const token = value?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token)
      throw new UnauthorizedException("ADMIN_AUTHENTICATION_REQUIRED");

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        role: string;
      }>(token);
      if (
        !payload.sub ||
        !payload.email ||
        !["SUPER_ADMIN", "ADMIN"].includes(payload.role)
      ) {
        throw new Error("Invalid admin claims");
      }
      const account = await this.accounts.findById(payload.sub);
      if (
        !account ||
        account.status !== "ACTIVE" ||
        account.email !== payload.email ||
        account.role !== payload.role
      ) {
        throw new Error("Admin session is no longer active");
      }
      request.admin = {
        id: account.id,
        email: account.email,
        role: account.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException("ADMIN_AUTHENTICATION_REQUIRED");
    }
  }
}
