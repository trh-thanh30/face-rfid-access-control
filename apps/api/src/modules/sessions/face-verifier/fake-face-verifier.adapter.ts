import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FaceVerifierInfrastructureError,
  type FaceVerificationInput,
  type FaceVerificationResult,
  type FaceVerifierPort,
} from "./face-verifier.port";

type FakeMode = "allow" | "mismatch" | "camera_busy" | "timeout";

@Injectable()
export class FakeFaceVerifierAdapter implements FaceVerifierPort {
  private busy = false;

  constructor(private readonly config: ConfigService) {}

  async verify(input: FaceVerificationInput): Promise<FaceVerificationResult> {
    const startedAt = Date.now();
    const mode = this.config.get<string>("FAKE_FACE_MODE", "allow") as FakeMode;
    if (this.busy || mode === "camera_busy") {
      return evidence(false, null, "CAMERA_BUSY", startedAt);
    }
    this.busy = true;
    try {
      await Promise.resolve();
      if (mode === "timeout" || new Date() >= input.deadline) {
        throw new FaceVerifierInfrastructureError("Face verifier timed out");
      }
      if (mode === "mismatch") {
        return evidence(false, 0.2, "FACE_MISMATCH", startedAt);
      }
      return evidence(true, 0.9, undefined, startedAt);
    } finally {
      this.busy = false;
    }
  }
}

function evidence(
  matched: boolean,
  similarity: number | null,
  reasonCode: FaceVerificationResult["reasonCode"],
  startedAt: number,
): FaceVerificationResult {
  return {
    matched,
    similarity,
    validFrameCount: reasonCode === "CAMERA_BUSY" ? 0 : 3,
    modelVersion: "fake-face-v1",
    pipelineFingerprint: "fake-pipeline-v1",
    latencyMs: Math.max(0, Date.now() - startedAt),
    reasonCode,
  };
}
