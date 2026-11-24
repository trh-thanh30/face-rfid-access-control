import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { Reflector } from "@nestjs/core";
import { AdminJwtGuard } from "../guards/admin-jwt.guard";
import { AdminRolesGuard } from "../guards/admin-roles.guard";
import type { AdminAccountRepository } from "../repository/admin-account.repository.interface";

function context(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

describe("Admin security guards", () => {
  const active = {
    id: "admin-id",
    email: "admin@example.com",
    passwordHash: "not-returned",
    fullName: "Admin",
    role: "ADMIN" as const,
    status: "ACTIVE" as const,
  };

  it("rejects missing credentials", async () => {
    const guard = new AdminJwtGuard(
      {} as JwtService,
      {} as AdminAccountRepository,
    );
    await expect(
      guard.canActivate(context({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a token after the account is disabled", async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: active.id,
        email: active.email,
        role: active.role,
      }),
    };
    const accounts = {
      findById: jest.fn().mockResolvedValue({ ...active, status: "DISABLED" }),
    };
    const guard = new AdminJwtGuard(
      jwt as unknown as JwtService,
      accounts as unknown as AdminAccountRepository,
    );
    await expect(
      guard.canActivate(
        context({ headers: { authorization: "Bearer signed" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects unsupported roles even when the JWT signature is valid", async () => {
    const jwt = {
      verifyAsync: jest
        .fn()
        .mockResolvedValue({ ...active, sub: active.id, role: "ROOT" }),
    };
    const guard = new AdminJwtGuard(
      jwt as unknown as JwtService,
      { findById: jest.fn() } as unknown as AdminAccountRepository,
    );
    await expect(
      guard.canActivate(
        context({ headers: { authorization: "Bearer signed" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches only the current active account after verifying claims", async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: active.id,
        email: active.email,
        role: active.role,
      }),
    };
    const accounts = { findById: jest.fn().mockResolvedValue(active) };
    const request = { headers: { authorization: "Bearer signed" } };
    const guard = new AdminJwtGuard(
      jwt as unknown as JwtService,
      accounts as unknown as AdminAccountRepository,
    );
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request).toHaveProperty("admin", {
      id: active.id,
      email: active.email,
      role: active.role,
    });
  });

  it("denies ADMIN from SUPER_ADMIN operations", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["SUPER_ADMIN"]),
    };
    const guard = new AdminRolesGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(context({ admin: active }))).toThrow(
      ForbiddenException,
    );
  });
});
