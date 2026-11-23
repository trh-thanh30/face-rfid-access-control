import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  accessReasonCodeSchema,
  visionEnrollmentResponseSchema,
  visionVerificationResponseSchema,
  VISION_ENDPOINTS,
  type AccessReasonCode,
  type VisionEnrollmentRequest,
  type VisionVerificationRequest,
} from "@access/shared";
import {
  FaceVerifierInfrastructureError,
  type FaceVerificationInput,
  type FaceVerificationResult,
  type FaceVerifierPort,
} from "../sessions/face-verifier/face-verifier.port";
import type {
  FaceEnrollmentInput,
  FaceEnrollmentPort,
} from "./face-enrollment.port";
import {
  FACE_TEMPLATE_REPOSITORY,
  type FaceTemplateRepository,
} from "./face-template.repository.interface";
import { Inject } from "@nestjs/common";

@Injectable()
export class HttpVisionAdapter implements FaceVerifierPort, FaceEnrollmentPort {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly threshold: number;
  private readonly minimumValidFrames: number;
  private readonly requestTimeoutMs: number;

  constructor(
    config: ConfigService,
    @Inject(FACE_TEMPLATE_REPOSITORY)
    private readonly templates: FaceTemplateRepository,
  ) {
    this.baseUrl = config.getOrThrow<string>("VISION_URL").replace(/\/$/, "");
    this.token = config.getOrThrow<string>("VISION_SERVICE_TOKEN");
    this.threshold = config.getOrThrow<number>("VISION_VERIFICATION_THRESHOLD");
    this.minimumValidFrames = config.getOrThrow<number>(
      "VISION_MINIMUM_VALID_FRAMES",
    );
    this.requestTimeoutMs = config.getOrThrow<number>(
      "VISION_REQUEST_TIMEOUT_MS",
    );
  }

  async verify(input: FaceVerificationInput): Promise<FaceVerificationResult> {
    const references = await this.templates.findActiveByPersonId(
      input.personId,
    );
    if (references.length === 0) {
      return {
        matched: false,
        similarity: null,
        validFrameCount: 0,
        modelVersion: "unavailable",
        pipelineFingerprint: "unavailable",
        latencyMs: 0,
        reasonCode: "NO_FACE_PROFILE",
      };
    }
    const payload: VisionVerificationRequest = {
      sessionId: input.sessionId,
      correlationId: input.correlationId,
      deadline: input.deadline.toISOString(),
      minimumValidFrames: this.minimumValidFrames,
      threshold: this.threshold,
      references: references.map((reference) => ({
        templateId: reference.id,
        embedding: reference.embedding,
        modelVersion: reference.modelVersion,
        pipelineFingerprint: reference.pipelineFingerprint,
      })),
    };
    let response: unknown;
    try {
      response = await this.post(VISION_ENDPOINTS.verifications, payload);
    } catch (error) {
      if (error instanceof VisionRejectedError) {
        return {
          matched: false,
          similarity: null,
          validFrameCount: 0,
          modelVersion: "unavailable",
          pipelineFingerprint: "unavailable",
          latencyMs: 0,
          reasonCode: error.reasonCode,
        };
      }
      throw error;
    }
    const parsed = visionVerificationResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new FaceVerifierInfrastructureError("Malformed Vision response");
    }
    return parsed.data;
  }

  async enroll(input: FaceEnrollmentInput) {
    const payload: VisionEnrollmentRequest = {
      sessionId: input.sessionId,
      correlationId: input.correlationId,
      deadline: input.deadline.toISOString(),
      sampleCount: input.sampleCount,
    };
    const response = await this.post(VISION_ENDPOINTS.enrollments, payload);
    const parsed = visionEnrollmentResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new FaceVerifierInfrastructureError("Malformed Vision response");
    }
    return parsed.data;
  }

  private async post(path: string, payload: object): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          reasonCode?: unknown;
        } | null;
        const reason = accessReasonCodeSchema.safeParse(body?.reasonCode);
        if (reason.success) throw new VisionRejectedError(reason.data);
        throw new FaceVerifierInfrastructureError(
          `Vision request failed with status ${response.status}`,
        );
      }
      return await response.json();
    } catch (error) {
      if (error instanceof FaceVerifierInfrastructureError) throw error;
      throw new FaceVerifierInfrastructureError("Vision request failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}

class VisionRejectedError extends FaceVerifierInfrastructureError {
  constructor(readonly reasonCode: AccessReasonCode) {
    super(`Vision rejected capture: ${reasonCode}`);
  }
}
