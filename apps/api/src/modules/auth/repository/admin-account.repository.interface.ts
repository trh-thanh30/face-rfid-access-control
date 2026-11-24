export const ADMIN_ACCOUNT_REPOSITORY = Symbol("ADMIN_ACCOUNT_REPOSITORY");

export type AdminAccountRecord = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: "SUPER_ADMIN" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
};

export interface AdminAccountRepository {
  findByEmail(email: string): Promise<AdminAccountRecord | null>;
  findById(id: string): Promise<AdminAccountRecord | null>;
}
