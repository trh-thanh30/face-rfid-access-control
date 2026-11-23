import { randomUUID } from "node:crypto";
import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { FaceEnrollmentRequest } from "@access/shared";
import {
  PERSON_REPOSITORY,
  type PersonRepository,
} from "../people/repository/person.repository.interface";
import { FaceVerifierInfrastructureError } from "../sessions/face-verifier/face-verifier.port";
import {
  FACE_ENROLLMENT_PORT,
  type FaceEnrollmentPort,
} from "./face-enrollment.port";
import {
  FACE_TEMPLATE_REPOSITORY,
  type FaceTemplateRepository,
} from "./face-template.repository.interface";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EnrollFaceUseCase {
  private readonly timeoutMs: number;

  constructor(
    @Inject(PERSON_REPOSITORY) private readonly people: PersonRepository,
    @Inject(FACE_TEMPLATE_REPOSITORY)
    private readonly templates: FaceTemplateRepository,
    @Inject(FACE_ENROLLMENT_PORT)
    private readonly vision: FaceEnrollmentPort,
    config: ConfigService,
  ) {
    this.timeoutMs =
      config.getOrThrow<number>("VISION_ENROLLMENT_TIMEOUT_SECONDS") * 1000;
  }

  async execute(personId: string, request: FaceEnrollmentRequest) {
    const person = await this.people.findById(personId);
    if (!person) throw new NotFoundException("PERSON_NOT_FOUND");
    if (person.status !== "ACTIVE") {
      throw new NotFoundException("ACTIVE_PERSON_NOT_FOUND");
    }
    try {
      const result = await this.vision.enroll({
        sessionId: randomUUID(),
        correlationId: randomUUID(),
        deadline: new Date(Date.now() + this.timeoutMs),
        sampleCount: request.sampleCount,
      });
      const count = await this.templates.replaceActive(
        personId,
        result.templates.map((template) => ({
          embedding: template.embedding,
          qualityScore: template.qualityScore,
          modelVersion: template.modelVersion,
          pipelineFingerprint: template.pipelineFingerprint,
        })),
      );
      return {
        personId,
        templateCount: count,
        modelVersion: result.modelVersion,
        pipelineFingerprint: result.pipelineFingerprint,
        quality: result.quality,
      };
    } catch (error) {
      if (error instanceof FaceVerifierInfrastructureError) {
        throw new BadGatewayException("VISION_SERVICE_UNAVAILABLE");
      }
      throw error;
    }
  }
}
