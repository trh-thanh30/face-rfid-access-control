import { z } from "zod";
import { accessReasonCodeSchema } from "./access-contracts.ts";

const embeddingSchema = z.array(z.number().finite()).min(1).max(2048);

export const faceEnrollmentRequestSchema = z
  .object({ sampleCount: z.number().int().min(5).max(10).default(5) })
  .strict();

export const visionEnrollmentRequestSchema = z
  .object({
    sessionId: z.uuid(),
    correlationId: z.string().trim().min(1).max(128),
    deadline: z.iso.datetime({ offset: true }),
    sampleCount: z.number().int().min(5).max(10),
  })
  .strict();

export const visionEnrollmentTemplateSchema = z
  .object({
    embedding: embeddingSchema,
    qualityScore: z.number().min(0).max(1),
    modelVersion: z.string().trim().min(1).max(128),
    pipelineFingerprint: z.string().trim().min(1).max(256),
  })
  .strict();

export const visionEnrollmentResponseSchema = z
  .object({
    templates: z.array(visionEnrollmentTemplateSchema).min(5).max(10),
    rejectedFrameCount: z.number().int().nonnegative(),
    modelVersion: z.string().trim().min(1).max(128),
    pipelineFingerprint: z.string().trim().min(1).max(256),
    quality: z.record(z.string(), z.number().finite()),
    latencyMs: z.number().int().nonnegative(),
  })
  .strict();

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
export type FaceEnrollmentRequest = z.infer<typeof faceEnrollmentRequestSchema>;
export type VisionEnrollmentRequest = z.infer<
  typeof visionEnrollmentRequestSchema
>;
export type VisionEnrollmentResponse = z.infer<
  typeof visionEnrollmentResponseSchema
>;
export type VisionVerificationResponse = z.infer<
  typeof visionVerificationResponseSchema
>;
