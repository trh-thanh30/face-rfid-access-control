import { z } from "zod";
import { accessReasonCodeSchema } from "./access-contracts.ts";

const embeddingSchema = z.array(z.number().finite()).min(1).max(2048);

export const visionReferenceSchema = z
  .object({
    templateId: z.uuid(),
    embedding: embeddingSchema,
    modelVersion: z.string().trim().min(1).max(128),
    pipelineFingerprint: z.string().trim().min(1).max(256),
  })
  .strict();

export const visionVerificationRequestSchema = z
  .object({
    sessionId: z.uuid(),
    correlationId: z.string().trim().min(1).max(128),
    deadline: z.iso.datetime({ offset: true }),
    minimumValidFrames: z.number().int().min(1).max(30),
    threshold: z.number().min(-1).max(1),
    references: z.array(visionReferenceSchema).min(1).max(20),
  })
  .strict();

export const visionVerificationResponseSchema = z
  .object({
    matched: z.boolean(),
    similarity: z.number().min(-1).max(1).nullable(),
    validFrameCount: z.number().int().nonnegative(),
    modelVersion: z.string().trim().min(1).max(128),
    pipelineFingerprint: z.string().trim().min(1).max(256),
    latencyMs: z.number().int().nonnegative(),
    reasonCode: accessReasonCodeSchema.optional(),
    quality: z.record(z.string(), z.number().finite()),
  })
  .strict();

export type VisionVerificationRequest = z.infer<
  typeof visionVerificationRequestSchema
>;
export type VisionVerificationResponse = z.infer<
  typeof visionVerificationResponseSchema
>;
