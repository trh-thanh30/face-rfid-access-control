import type { AccessReasonCode } from "@access/shared";

export const FACE_VERIFIER_PORT = Symbol("FACE_VERIFIER_PORT");

export type FaceVerificationInput = {
  sessionId: string;
  correlationId: string;
  personId: string;
  deadline: Date;
};

export type FaceVerificationResult = {
  matched: boolean;
  similarity: number | null;
  validFrameCount: number;
  modelVersion: string;
  pipelineFingerprint: string;
  latencyMs: number;
  reasonCode?: AccessReasonCode;
};

export interface FaceVerifierPort {
  verify(input: FaceVerificationInput): Promise<FaceVerificationResult>;
}

export class FaceVerifierInfrastructureError extends Error {}
