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

    return account ? mapAccount(account) : null;
  }

  async findById(id: string): Promise<AdminAccountRecord | null> {
    const account = await this.prisma.adminAccount.findUnique({
      where: { id },
    });
    return account ? mapAccount(account) : null;
  }
}

function mapAccount(account: {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: "SUPER_ADMIN" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
}): AdminAccountRecord {
  return {
    id: account.id,
    email: account.email,
    passwordHash: account.password_hash,
    fullName: account.full_name,
    role: account.role,
    status: account.status,
  };
}
