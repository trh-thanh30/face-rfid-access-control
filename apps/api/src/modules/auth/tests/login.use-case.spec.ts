import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { AdminAccountRepository } from "../repository/admin-account.repository.interface";
import { LoginUseCase } from "../use-cases/login.use-case";
import { SecurityAttemptLimiter } from "../../../common/security/security-attempt-limiter";
import { ConfigService } from "@nestjs/config";

describe("LoginUseCase", () => {
  const jwt = { signAsync: jest.fn().mockResolvedValue("signed-token") };
  const limiter = () => new SecurityAttemptLimiter(new ConfigService());

  it("returns a token for an active account with a valid password", async () => {
    const passwordHash = await bcrypt.hash("ChangeMe123!", 4);
    const repository: AdminAccountRepository = {
      findByEmail: jest.fn().mockResolvedValue({
        id: "admin-id",
        email: "admin@example.com",
        passwordHash,
        fullName: "Admin",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      }),
      findById: jest.fn(),
    };
    const useCase = new LoginUseCase(
      repository,
      jwt as unknown as JwtService,
      limiter(),
    );

    await expect(
      useCase.execute({
        email: "admin@example.com",
        password: "ChangeMe123!",
      }),
    ).resolves.toMatchObject({ accessToken: "signed-token" });
  });

  it("rejects disabled accounts", async () => {
    const repository: AdminAccountRepository = {
      findByEmail: jest.fn().mockResolvedValue({
        id: "admin-id",
        email: "admin@example.com",
        passwordHash: await bcrypt.hash("ChangeMe123!", 4),
        fullName: "Admin",
        role: "ADMIN",
        status: "DISABLED",
      }),
      findById: jest.fn(),
    };
    const useCase = new LoginUseCase(
      repository,
      jwt as unknown as JwtService,
      limiter(),
    );

    await expect(
      useCase.execute({
        email: "admin@example.com",
        password: "ChangeMe123!",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rate limits repeated invalid passwords without logging the password", async () => {
    const repository: AdminAccountRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
    };
    const attempts = new SecurityAttemptLimiter(
      new ConfigService({ ADMIN_LOGIN_MAX_FAILURES: 2 }),
    );
    const useCase = new LoginUseCase(
      repository,
      jwt as unknown as JwtService,
      attempts,
    );
    const input = { email: "target@example.com", password: "wrong-value" };
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(useCase.execute(input)).rejects.toMatchObject({ status: 429 });
    expect(repository.findByEmail).toHaveBeenCalledTimes(2);
  });
});
