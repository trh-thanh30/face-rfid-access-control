import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import type {
  AdminAccountRecord,
  AdminAccountRepository,
} from "./admin-account.repository.interface";

@Injectable()
export class PrismaAdminAccountRepository implements AdminAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AdminAccountRecord | null> {
    const account = await this.prisma.adminAccount.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!account) return null;

    return {
      id: account.id,
      email: account.email,
      passwordHash: account.password_hash,
      fullName: account.full_name,
      role: account.role,
      status: account.status,
    };
  }
}
