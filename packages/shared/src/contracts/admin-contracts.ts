import { z } from "zod";

export const PERSON_STATUSES = ["ACTIVE", "DISABLED"] as const;
export const CREDENTIAL_STATUSES = ["ACTIVE", "REVOKED"] as const;
export const GRANT_STATUSES = ["ACTIVE", "REVOKED"] as const;
export const DEVICE_STATUSES = ["ACTIVE", "DISABLED"] as const;

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);
const dateOnlySchema = z.iso.date();
const timeOnlySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/);
const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((timezone) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone");

export const createPersonSchema = z
  .object({
    code: codeSchema,
    fullName: z.string().trim().min(1).max(160),
  })
  .strict();

export const updatePersonSchema = z
  .object({
    code: codeSchema.optional(),
    fullName: z.string().trim().min(1).max(160).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "No changes supplied");

export const listPeopleQuerySchema = z
  .object({
    search: z.string().trim().max(160).optional(),
    status: z.enum(PERSON_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const attachRfidCredentialSchema = z
  .object({
    uid: z.string().trim().min(4).max(128),
    replaceExisting: z.boolean().default(false),
  })
  .strict();

export const createAccessGrantSchema = z
  .object({
    personId: z.uuid(),
    accessPointId: z.uuid(),
    validFrom: dateOnlySchema,
    validUntil: dateOnlySchema,
    timeFrom: timeOnlySchema,
    timeUntil: timeOnlySchema,
    timezone: timezoneSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.validFrom > value.validUntil) {
      context.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "validUntil must be on or after validFrom",
      });
    }
    if (normalizeTime(value.timeFrom) === normalizeTime(value.timeUntil)) {
      context.addIssue({
        code: "custom",
        path: ["timeUntil"],
        message: "timeFrom and timeUntil must differ",
      });
    }
  });

export const updateAccessGrantSchema = z
  .object({
    validFrom: dateOnlySchema.optional(),
    validUntil: dateOnlySchema.optional(),
    timeFrom: timeOnlySchema.optional(),
    timeUntil: timeOnlySchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "No changes supplied");

export const listAccessGrantsQuerySchema = z
  .object({
    personId: z.uuid().optional(),
    accessPointId: z.uuid().optional(),
    status: z.enum(GRANT_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const createAccessPointSchema = z
  .object({
    code: codeSchema,
    name: z.string().trim().min(1).max(160),
    location: z.string().trim().max(255).optional(),
    timezone: timezoneSchema,
  })
  .strict();

export const registerDeviceSchema = z
  .object({
    accessPointId: z.uuid(),
    deviceCode: codeSchema,
  })
  .strict();

export const listDevicesQuerySchema = z
  .object({
    accessPointId: z.uuid().optional(),
    status: z.enum(DEVICE_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const listAccessEventsQuerySchema = z
  .object({
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    personId: z.uuid().optional(),
    deviceId: z.uuid().optional(),
    result: z.string().trim().min(1).max(64).optional(),
    reasonCode: z.string().trim().min(1).max(64).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "from must be before to",
    path: ["to"],
  });

export function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type ListPeopleQuery = z.infer<typeof listPeopleQuerySchema>;
export type AttachRfidCredentialInput = z.infer<
  typeof attachRfidCredentialSchema
>;
export type CreateAccessGrantInput = z.infer<typeof createAccessGrantSchema>;
export type UpdateAccessGrantInput = z.infer<typeof updateAccessGrantSchema>;
export type ListAccessGrantsQuery = z.infer<typeof listAccessGrantsQuerySchema>;
export type CreateAccessPointInput = z.infer<typeof createAccessPointSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;
export type ListAccessEventsQuery = z.infer<typeof listAccessEventsQuerySchema>;
