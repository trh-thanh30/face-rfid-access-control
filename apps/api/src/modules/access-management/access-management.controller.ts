import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  attachRfidCredentialSchema,
  createAccessGrantSchema,
  listAccessGrantsQuerySchema,
  updateAccessGrantSchema,
  type AttachRfidCredentialInput,
  type CreateAccessGrantInput,
  type ListAccessGrantsQuery,
  type UpdateAccessGrantInput,
} from "@access/shared";
import { SchemaValidationPipe } from "../../common/pipes/schema-validation.pipe";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import {
  AttachRfidCredentialUseCase,
  CreateAccessGrantUseCase,
  GetAccessGrantUseCase,
  ListAccessGrantsUseCase,
  RevokeAccessGrantUseCase,
  RevokeRfidCredentialUseCase,
  UpdateAccessGrantUseCase,
} from "./use-cases/access-management.use-cases";

@Controller()
@UseGuards(AdminJwtGuard)
export class RfidCredentialController {
  constructor(
    private readonly attachCredential: AttachRfidCredentialUseCase,
    private readonly revokeCredential: RevokeRfidCredentialUseCase,
  ) {}

  @Post("v1/people/:personId/rfid-credentials")
  attach(
    @Param("personId", ParseUUIDPipe) personId: string,
    @Body(new SchemaValidationPipe(attachRfidCredentialSchema))
    input: AttachRfidCredentialInput,
  ) {
    return this.attachCredential.execute(
      personId,
      input.uid,
      input.replaceExisting,
    );
  }

  @Patch("v1/rfid-credentials/:id/revoke")
  revoke(@Param("id", ParseUUIDPipe) id: string) {
    return this.revokeCredential.execute(id);
  }

  @Get("v1/people/:personId/rfid-credentials")
  list(@Param("personId", ParseUUIDPipe) personId: string) {
    return this.attachCredential.list(personId);
  }
}

@Controller("v1/access-grants")
@UseGuards(AdminJwtGuard)
export class AccessGrantController {
  constructor(
    private readonly createGrant: CreateAccessGrantUseCase,
    private readonly updateGrant: UpdateAccessGrantUseCase,
    private readonly revokeGrant: RevokeAccessGrantUseCase,
    private readonly getGrant: GetAccessGrantUseCase,
    private readonly listGrants: ListAccessGrantsUseCase,
  ) {}

  @Post()
  create(
    @Body(new SchemaValidationPipe(createAccessGrantSchema))
    input: CreateAccessGrantInput,
  ) {
    return this.createGrant.execute(input);
  }

  @Get()
  list(
    @Query(new SchemaValidationPipe(listAccessGrantsQuerySchema))
    query: ListAccessGrantsQuery,
  ) {
    return this.listGrants.execute(query);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getGrant.execute(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new SchemaValidationPipe(updateAccessGrantSchema))
    input: UpdateAccessGrantInput,
  ) {
    return this.updateGrant.execute(id, input);
  }

  @Patch(":id/revoke")
  revoke(@Param("id", ParseUUIDPipe) id: string) {
    return this.revokeGrant.execute(id);
  }
}
