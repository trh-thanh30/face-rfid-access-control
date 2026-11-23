import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PeopleModule } from "../people/people.module";
import { FACE_ENROLLMENT_PORT } from "./face-enrollment.port";
import { FaceController } from "./face.controller";
import { FACE_TEMPLATE_REPOSITORY } from "./face-template.repository.interface";
import { HttpVisionAdapter } from "./http-vision.adapter";
import { PrismaFaceTemplateRepository } from "./prisma-face-template.repository";
import { EnrollFaceUseCase } from "./enroll-face.use-case";
import { FACE_VERIFIER_PORT } from "../sessions/face-verifier/face-verifier.port";

@Module({
  imports: [AuthModule, PeopleModule],
  controllers: [FaceController],
  providers: [
    PrismaFaceTemplateRepository,
    {
      provide: FACE_TEMPLATE_REPOSITORY,
      useExisting: PrismaFaceTemplateRepository,
    },
    HttpVisionAdapter,
    { provide: FACE_ENROLLMENT_PORT, useExisting: HttpVisionAdapter },
    { provide: FACE_VERIFIER_PORT, useExisting: HttpVisionAdapter },
    EnrollFaceUseCase,
  ],
  exports: [FACE_VERIFIER_PORT, FACE_TEMPLATE_REPOSITORY],
})
export class FaceModule {}
