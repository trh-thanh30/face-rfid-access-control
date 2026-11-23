import type { VisionEnrollmentResponse } from "@access/shared";
import type { AccessReasonCode } from "@access/shared";

export const FACE_ENROLLMENT_PORT = Symbol("FACE_ENROLLMENT_PORT");

export type FaceEnrollmentInput = {
  sessionId: string;
  correlationId: string;
  deadline: Date;
  sampleCount: number;
};

export interface FaceEnrollmentPort {
  enroll(input: FaceEnrollmentInput): Promise<VisionEnrollmentResponse>;
}

export class FaceEnrollmentRejectedError extends Error {
  constructor(readonly reasonCode: AccessReasonCode) {
    super(`Face enrollment rejected: ${reasonCode}`);
  }
}
