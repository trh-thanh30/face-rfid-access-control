import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { SecurityAttemptLimiter } from "../../../common/security/security-attempt-limiter";
import {
  ADMIN_ACCOUNT_REPOSITORY,
  type AdminAccountRepository,
} from "../repository/admin-account.repository.interface";

export type LoginInput = { email: string; password: string };

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(ADMIN_ACCOUNT_REPOSITORY)
    private readonly accounts: AdminAccountRepository,
    private readonly jwt: JwtService,
    private readonly attempts: SecurityAttemptLimiter,
  ) {}

  async execute(input: LoginInput) {
    const identifier = input.email.trim().toLowerCase();
    this.attempts.assertAllowed("ADMIN_LOGIN", identifier);
    const account = await this.accounts.findByEmail(input.email);
    const passwordMatches = account
      ? await bcrypt.compare(input.password, account.passwordHash)
      : false;

    if (!account || account.status !== "ACTIVE" || !passwordMatches) {
      this.attempts.recordFailure("ADMIN_LOGIN", identifier);
      throw new UnauthorizedException("Email or password is invalid");
    }
    this.attempts.recordSuccess("ADMIN_LOGIN", identifier);

    return {
      accessToken: await this.jwt.signAsync({
        sub: account.id,
        email: account.email,
        role: account.role,
      }),
      account: {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        role: account.role,
      },
    };
  }
}
