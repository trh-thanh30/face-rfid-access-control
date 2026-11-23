import {
  Body,
  Controller,
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

@Controller("v1/people/:personId/face-enrollments")
@UseGuards(AdminJwtGuard)
export class FaceController {
  constructor(private readonly enrollFace: EnrollFaceUseCase) {}

  @Post()
  enroll(
    @Param("personId", ParseUUIDPipe) personId: string,
    @Body(new SchemaValidationPipe(faceEnrollmentRequestSchema))
    request: FaceEnrollmentRequest,
  ) {
    return this.enrollFace.execute(personId, request);
  }
}
