import { createHmac } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  admin_role,
  account_status,
  credential_status,
  grant_status,
  person_status,
  PrismaClient,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const rfidHashKey = process.env.RFID_HASH_KEY;

if (!databaseUrl || !rfidHashKey) {
  throw new Error(
    "DATABASE_URL and RFID_HASH_KEY are required to seed the database",
  );
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

  const demoPerson = await prisma.person.upsert({
    where: { code: "P-DEMO" },
    update: { full_name: "Người dùng demo", status: person_status.ACTIVE },
    create: {
      code: "P-DEMO",
      full_name: "Người dùng demo",
      status: person_status.ACTIVE,
    },
  });

  const disabledPerson = await prisma.person.upsert({
    where: { code: "P-DISABLED" },
    update: { full_name: "Người dùng bị khóa", status: person_status.DISABLED },
    create: {
      code: "P-DISABLED",
      full_name: "Người dùng bị khóa",
      status: person_status.DISABLED,
    },
  });

  await upsertActiveCredential(demoPerson.id, "04A1B2C3");
  await upsertActiveCredential(disabledPerson.id, "04DEAD01");

  const existingGrant = await prisma.accessGrant.findFirst({
    where: {
      person_id: demoPerson.id,
      access_point_id: accessPoint.id,
      status: grant_status.ACTIVE,
    },
  });
  const grantData = {
    valid_from: new Date("2025-01-01T00:00:00Z"),
    valid_until: new Date("2035-12-31T00:00:00Z"),
    time_from: new Date("1970-01-01T06:00:00Z"),
    time_until: new Date("1970-01-01T23:00:00Z"),
    timezone: "Asia/Ho_Chi_Minh",
    status: grant_status.ACTIVE,
  };
  if (existingGrant) {
    await prisma.accessGrant.update({
      where: { id: existingGrant.id },
      data: grantData,
    });
  } else {
    await prisma.accessGrant.create({
      data: {
        person_id: demoPerson.id,
        access_point_id: accessPoint.id,
        ...grantData,
      },
    });
  }
}

async function upsertActiveCredential(personId: string, uid: string) {
  const uidHash = createHmac("sha256", rfidHashKey!).update(uid).digest("hex");
  const current = await prisma.rfidCredential.findFirst({
    where: { uid_hash: uidHash, status: credential_status.ACTIVE },
  });
  if (current) {
    await prisma.rfidCredential.update({
      where: { id: current.id },
      data: { person_id: personId, display_hint: `…${uid.slice(-4)}` },
    });
  } else {
    await prisma.rfidCredential.create({
      data: {
        person_id: personId,
        uid_hash: uidHash,
        display_hint: `…${uid.slice(-4)}`,
      },
    });
  }
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
