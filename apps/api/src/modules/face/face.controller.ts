import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  faceEnrollmentRequestSchema,
  type FaceEnrollmentRequest,
} from "@access/shared";
import { SchemaValidationPipe } from "../../common/pipes/schema-validation.pipe";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { EnrollFaceUseCase } from "./enroll-face.use-case";
import { DeleteFaceTemplatesUseCase } from "./delete-face-templates.use-case";
import {
  FACE_TEMPLATE_REPOSITORY,
  type FaceTemplateRepository,
} from "./face-template.repository.interface";

@Controller("v1/people/:personId/face-enrollments")
@UseGuards(AdminJwtGuard)
export class FaceController {
  constructor(
    private readonly enrollFace: EnrollFaceUseCase,
    private readonly deleteTemplates: DeleteFaceTemplatesUseCase,
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

  @Delete()
  remove(
    @Param("personId", ParseUUIDPipe) personId: string,
    @Req() request: { admin?: { id: string } },
  ) {
    return this.deleteTemplates.execute(personId, request.admin!.id);
  }
}
