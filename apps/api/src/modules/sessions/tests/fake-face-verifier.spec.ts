import { ConfigService } from "@nestjs/config";
import { FakeFaceVerifierAdapter } from "../face-verifier/fake-face-verifier.adapter";
import { FaceVerifierInfrastructureError } from "../face-verifier/face-verifier.port";

describe("FakeFaceVerifierAdapter", () => {
  const input = {
    sessionId: "session-id",
    correlationId: "correlation-id",
    personId: "person-id",
    deadline: new Date(Date.now() + 60_000),
  };

  it.each([
    ["allow", true, undefined],
    ["mismatch", false, "FACE_MISMATCH"],
    ["camera_busy", false, "CAMERA_BUSY"],
  ])("supports %s scenario", async (mode, matched, reasonCode) => {
    const adapter = new FakeFaceVerifierAdapter(
      new ConfigService({ FAKE_FACE_MODE: mode }),
    );
    await expect(adapter.verify(input)).resolves.toMatchObject({
      matched,
      reasonCode,
      modelVersion: "fake-face-v1",
    });
  });

  it("reports timeout as infrastructure failure, not face mismatch", async () => {
    const adapter = new FakeFaceVerifierAdapter(
      new ConfigService({ FAKE_FACE_MODE: "timeout" }),
    );
    await expect(adapter.verify(input)).rejects.toBeInstanceOf(
      FaceVerifierInfrastructureError,
    );
  });
});
