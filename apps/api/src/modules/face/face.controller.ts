import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  faceEnrollmentRequestSchema,
  type FaceEnrollmentRequest,
} from "@access/shared";
import { SchemaValidationPipe } from "../../common/pipes/schema-validation.pipe";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { EnrollFaceUseCase } from "./enroll-face.use-case";
import {
  FACE_TEMPLATE_REPOSITORY,
  type FaceTemplateRepository,
} from "./face-template.repository.interface";

@Controller("v1/people/:personId/face-enrollments")
@UseGuards(AdminJwtGuard)
export class FaceController {
  constructor(
    private readonly enrollFace: EnrollFaceUseCase,
    @Inject(FACE_TEMPLATE_REPOSITORY)
    private readonly templates: FaceTemplateRepository,
  ) {}

  @Get()
  summary(@Param("personId", ParseUUIDPipe) personId: string) {
    return this.templates.summary(personId);
  }

  @Post()
  enroll(
    @Param("personId", ParseUUIDPipe) personId: string,
    @Body(new SchemaValidationPipe(faceEnrollmentRequestSchema))
    request: FaceEnrollmentRequest,
  ) {
    return this.enrollFace.execute(personId, request);
  }
}
