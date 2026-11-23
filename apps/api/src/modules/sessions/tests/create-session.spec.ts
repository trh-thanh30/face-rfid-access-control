import { ConfigService } from "@nestjs/config";
import type { ClockPort } from "../../../common/clock/clock.port";
import type {
  AccessEligibilityResult,
  CheckAccessEligibilityUseCase,
} from "../../access-management/use-cases/access-management.use-cases";
import type {
  FaceVerificationResult,
  FaceVerifierPort,
} from "../face-verifier/face-verifier.port";
import type {
  SessionRecord,
  SessionRepository,
} from "../repository/session.repository.interface";
import {
  CreateAccessSessionUseCase,
  PollAccessSessionUseCase,
} from "../use-cases/session.use-cases";

describe("CreateAccessSessionUseCase", () => {
  const now = new Date("2026-11-23T03:00:00.000Z");
  const clock: ClockPort = { now: () => now };
  const config = new ConfigService({
    AUTH_SESSION_TTL_SECONDS: 10,
    ACTUATION_COMMAND_TTL_SECONDS: 5,
    ACTUATION_OPEN_DURATION_MS: 3000,
  });
  const principal = {
    id: "11111111-1111-4111-8111-111111111111",
    deviceCode: "ESP32_DOOR_01",
    accessPointId: "22222222-2222-4222-8222-222222222222",
  };
  const request = {
    deviceCode: principal.deviceCode,
    requestId: "request-1",
    timestamp: "2026-11-23T10:00:00+07:00",
    rfidUid: "04A1B2C3",
    firmwareVersion: "simulator-0.1.0",
  };
  const eligible: AccessEligibilityResult = {
    allowed: true,
    personId: "33333333-3333-4333-8333-333333333333",
    credentialId: "44444444-4444-4444-8444-444444444444",
    grantId: "55555555-5555-4555-8555-555555555555",
  };
  const evidence: FaceVerificationResult = {
    matched: true,
    similarity: 0.9,
    validFrameCount: 3,
    modelVersion: "fake-v1",
    pipelineFingerprint: "fake-pipeline-v1",
    latencyMs: 12,
  };

  function fixture(check: AccessEligibilityResult = eligible) {
    let current: SessionRecord | null = null;
    let allowCount = 0;
    const repository = {
      createOrFind: jest.fn().mockImplementation(async (input) => {
        if (current) return { session: current, created: false };
        current = {
          id: "66666666-6666-4666-8666-666666666666",
          deviceId: input.deviceId,
          requestId: input.request.requestId,
          correlationId: input.correlationId,
          rfidCredentialId: null,
          personId: null,
          accessGrantId: null,
          status: "PENDING",
          reasonCode: null,
          similarity: null,
          modelVersion: null,
          createdAt: input.createdAt,
          expiresAt: input.expiresAt,
          completedAt: null,
          command: null,
        };
        return { session: current, created: true };
      }),
      claimForVerification: jest.fn().mockImplementation(async () => {
        if (!current || current.status !== "PENDING") return false;
        current = { ...current, status: "VERIFYING" };
        return true;
      }),
      findById: jest.fn().mockImplementation(async () => current),
      deny: jest.fn().mockImplementation(async (input) => {
        current = {
          ...current!,
          status: "DENIED",
          reasonCode: input.reasonCode,
          personId: input.personId ?? null,
          rfidCredentialId: input.credentialId ?? null,
          completedAt: input.completedAt,
        };
        return current;
      }),
      allow: jest.fn().mockImplementation(async (input) => {
        allowCount += 1;
        current = {
          ...current!,
          status: "ALLOWED",
          personId: input.personId,
          rfidCredentialId: input.credentialId,
          accessGrantId: input.grantId,
          completedAt: input.completedAt,
          command: {
            id: "77777777-7777-4777-8777-777777777777",
            sessionId: current!.id,
            deviceId: current!.deviceId,
            openDurationMs: input.openDurationMs,
            expiresAt: input.commandExpiresAt,
            executionStatus: "PENDING",
            errorCode: null,
            acknowledgedAt: null,
          },
        };
        return current;
      }),
    } as unknown as SessionRepository;
    const eligibility = {
      execute: jest.fn().mockResolvedValue(check),
    } as unknown as CheckAccessEligibilityUseCase;
    const verifier = {
      verify: jest.fn().mockResolvedValue(evidence),
    } as unknown as FaceVerifierPort;
    const useCase = new CreateAccessSessionUseCase(
      repository,
      eligibility,
      verifier,
      clock,
      config,
    );
    return {
      repository,
      eligibility,
      verifier,
      useCase,
      allowCount: () => allowCount,
    };
  }

  it("deduplicates concurrent create retries and calls Vision only once", async () => {
    const test = fixture();
    const [first, retry] = await Promise.all([
      test.useCase.execute(principal, request),
      test.useCase.execute(principal, request),
    ]);

    expect(first.sessionId).toBe(retry.sessionId);
    expect(test.verifier.verify).toHaveBeenCalledTimes(1);
    expect(test.allowCount()).toBe(1);
    const polled = await new PollAccessSessionUseCase(
      test.repository,
      clock,
    ).execute(principal, first.sessionId);
    expect(polled.status).toBe("ALLOWED");
    expect(polled.command?.commandId).toBe(
      "77777777-7777-4777-8777-777777777777",
    );
  });

  it("denies an invalid grant before invoking Vision", async () => {
    const test = fixture({ allowed: false, reasonCode: "NO_PERMISSION" });
    await expect(
      test.useCase.execute(principal, request),
    ).resolves.toMatchObject({
      status: "DENIED",
      reasonCode: "NO_PERMISSION",
      allowed: false,
    });
    expect(test.verifier.verify).not.toHaveBeenCalled();
  });

  it("persists face mismatch as a biometric denial", async () => {
    const test = fixture();
    jest.mocked(test.verifier.verify).mockResolvedValue({
      ...evidence,
      matched: false,
      similarity: 0.2,
      reasonCode: "FACE_MISMATCH",
    });
    await expect(
      test.useCase.execute(principal, request),
    ).resolves.toMatchObject({
      status: "DENIED",
      reasonCode: "FACE_MISMATCH",
    });
  });
});
