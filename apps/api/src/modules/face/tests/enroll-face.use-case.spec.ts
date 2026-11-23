import { ConfigService } from "@nestjs/config";
import type { PersonRepository } from "../../people/repository/person.repository.interface";
import { EnrollFaceUseCase } from "../enroll-face.use-case";
import type { FaceEnrollmentPort } from "../face-enrollment.port";
import type { FaceTemplateRepository } from "../face-template.repository.interface";

describe("EnrollFaceUseCase", () => {
  it("replaces old active templates only after Vision enrollment succeeds", async () => {
    const people = {
      findById: jest.fn().mockResolvedValue({
        id: "person-id",
        status: "ACTIVE",
      }),
    } as unknown as PersonRepository;
    const templates = {
      replaceActive: jest.fn().mockResolvedValue(5),
    } as unknown as FaceTemplateRepository;
    const sample = {
      embedding: [1, 0],
      qualityScore: 0.9,
      modelVersion: "model-v1",
      pipelineFingerprint: "pipeline-v1",
    };
    const vision: FaceEnrollmentPort = {
      enroll: jest.fn().mockResolvedValue({
        templates: Array.from({ length: 5 }, () => sample),
        rejectedFrameCount: 1,
        modelVersion: "model-v1",
        pipelineFingerprint: "pipeline-v1",
        quality: { meanScore: 0.9 },
        latencyMs: 20,
      }),
    };
    const useCase = new EnrollFaceUseCase(
      people,
      templates,
      vision,
      new ConfigService({ VISION_ENROLLMENT_TIMEOUT_SECONDS: 30 }),
    );

    const result = await useCase.execute("person-id", { sampleCount: 5 });

    expect(templates.replaceActive).toHaveBeenCalledWith(
      "person-id",
      expect.arrayContaining([expect.objectContaining(sample)]),
    );
    expect(result.templateCount).toBe(5);
  });
});
