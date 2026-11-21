import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { AdminAccountRepository } from "../repository/admin-account.repository.interface";
import { LoginUseCase } from "../use-cases/login.use-case";

describe("LoginUseCase", () => {
  const jwt = { signAsync: jest.fn().mockResolvedValue("signed-token") };

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
    };
    const useCase = new LoginUseCase(repository, jwt as unknown as JwtService);

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
    };
    const useCase = new LoginUseCase(repository, jwt as unknown as JwtService);

    await expect(
      useCase.execute({
        email: "admin@example.com",
        password: "ChangeMe123!",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
