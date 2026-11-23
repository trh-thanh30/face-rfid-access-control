import { ConfigService } from "@nestjs/config";
import type { FaceTemplateRepository } from "../face-template.repository.interface";
import { HttpVisionAdapter } from "../http-vision.adapter";

jest.mock("@access/shared", () => ({
  accessReasonCodeSchema: {
    safeParse: (value: unknown) =>
      typeof value === "string"
        ? { success: true, data: value }
        : { success: false },
  },
  VISION_ENDPOINTS: {
    enrollments: "/internal/v1/enrollments",
    verifications: "/internal/v1/verifications",
  },
  visionEnrollmentResponseSchema: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
  visionVerificationResponseSchema: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
}));

const configuration = new ConfigService({
  VISION_URL: "http://vision:8001",
  VISION_SERVICE_TOKEN: "secret",
  VISION_VERIFICATION_THRESHOLD: 0.7,
  VISION_MINIMUM_VALID_FRAMES: 3,
  VISION_REQUEST_TIMEOUT_MS: 1000,
});

describe("HttpVisionAdapter", () => {
  afterEach(() => jest.restoreAllMocks());

  it("sends only templates belonging to the RFID-selected person", async () => {
    const templates: FaceTemplateRepository = {
      findActiveByPersonId: jest.fn().mockResolvedValue([
        {
          id: "b9a6aa1a-0279-4c1f-bda6-3ea49dd038fb",
          embedding: [1, 0],
          modelVersion: "model-v1",
          pipelineFingerprint: "pipeline-v1",
        },
      ]),
      replaceActive: jest.fn(),
      summary: jest.fn(),
    };
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          matched: true,
          similarity: 0.91,
          validFrameCount: 3,
          modelVersion: "model-v1",
          pipelineFingerprint: "pipeline-v1",
          latencyMs: 12,
          quality: { meanScore: 0.8 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const adapter = new HttpVisionAdapter(configuration, templates);

    const result = await adapter.verify({
      sessionId: "5ea71058-ff2c-4ec1-8a34-bd41cc7ca374",
      correlationId: "correlation",
      personId: "person-selected-by-rfid",
      deadline: new Date(Date.now() + 1000),
    });

    expect(result.matched).toBe(true);
    expect(templates.findActiveByPersonId).toHaveBeenCalledWith(
      "person-selected-by-rfid",
    );
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.references).toHaveLength(1);
    expect(body).not.toHaveProperty("personId");
    expect(init?.headers).toMatchObject({ authorization: "Bearer secret" });
  });

  it("fails closed before capture when the person has no template", async () => {
    const templates: FaceTemplateRepository = {
      findActiveByPersonId: jest.fn().mockResolvedValue([]),
      replaceActive: jest.fn(),
      summary: jest.fn(),
    };
    const fetchMock = jest.spyOn(global, "fetch");
    const adapter = new HttpVisionAdapter(configuration, templates);
    const result = await adapter.verify({
      sessionId: "5ea71058-ff2c-4ec1-8a34-bd41cc7ca374",
      correlationId: "correlation",
      personId: "person-id",
      deadline: new Date(Date.now() + 1000),
    });
    expect(result).toMatchObject({
      matched: false,
      reasonCode: "NO_FACE_PROFILE",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps an explicit Vision camera error without allowing access", async () => {
    const templates: FaceTemplateRepository = {
      findActiveByPersonId: jest.fn().mockResolvedValue([
        {
          id: "b9a6aa1a-0279-4c1f-bda6-3ea49dd038fb",
          embedding: [1, 0],
          modelVersion: "model-v1",
          pipelineFingerprint: "pipeline-v1",
        },
      ]),
      replaceActive: jest.fn(),
      summary: jest.fn(),
    };
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ reasonCode: "CAMERA_BUSY" }), {
        status: 422,
        headers: { "content-type": "application/json" },
      }),
    );
    const adapter = new HttpVisionAdapter(configuration, templates);
    const result = await adapter.verify({
      sessionId: "5ea71058-ff2c-4ec1-8a34-bd41cc7ca374",
      correlationId: "correlation",
      personId: "person-id",
      deadline: new Date(Date.now() + 1000),
    });
    expect(result).toMatchObject({
      matched: false,
      reasonCode: "CAMERA_BUSY",
    });
  });
});
