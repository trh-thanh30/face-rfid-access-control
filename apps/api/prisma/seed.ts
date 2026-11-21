import { PrismaPg } from "@prisma/adapter-pg";
import { admin_role, account_status, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  await prisma.adminAccount.upsert({
    where: { email: "admin@example.com" },
    update: {
      full_name: "Development Admin",
      role: admin_role.SUPER_ADMIN,
      status: account_status.ACTIVE,
    },
    create: {
      email: "admin@example.com",
      password_hash: passwordHash,
      full_name: "Development Admin",
      role: admin_role.SUPER_ADMIN,
      status: account_status.ACTIVE,
    },
  });

  const accessPoint = await prisma.accessPoint.upsert({
    where: { code: "DOOR_01" },
    update: {},
    create: {
      code: "DOOR_01",
      name: "Cửa thử nghiệm",
      location: "Phòng lab",
    },
  });

  const tokenHash = await bcrypt.hash("development-device-token", 12);
  await prisma.device.upsert({
    where: { device_code: "ESP32_DOOR_01" },
    update: { access_point_id: accessPoint.id },
    create: {
      access_point_id: accessPoint.id,
      device_code: "ESP32_DOOR_01",
      token_hash: tokenHash,
      firmware_version: "simulator-0.1.0",
      capabilities: {
        rfid: true,
        actuator: "VIRTUAL",
        doorSensor: false,
        indicators: true,
      },
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
