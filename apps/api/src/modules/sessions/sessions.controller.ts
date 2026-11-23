import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  acknowledgeCommandSchema,
  createAccessSessionSchema,
  type AcknowledgeCommand,
  type CreateAccessSession,
} from "@access/shared";
import { SchemaValidationPipe } from "../../common/pipes/schema-validation.pipe";
import {
  DeviceAuthGuard,
  type DeviceRequest,
} from "../devices/guards/device-auth.guard";
import { ContractVersionGuard } from "../devices/guards/contract-version.guard";
import { DeviceSessionOwnershipGuard } from "../devices/guards/device-session-ownership.guard";
import {
  AcknowledgeCommandUseCase,
  CreateAccessSessionUseCase,
  PollAccessSessionUseCase,
} from "./use-cases/session.use-cases";

@Controller("device/v1/access-sessions")
@UseGuards(ContractVersionGuard, DeviceAuthGuard)
export class SessionsController {
  constructor(
    private readonly createSession: CreateAccessSessionUseCase,
    private readonly pollSession: PollAccessSessionUseCase,
    private readonly acknowledgeCommand: AcknowledgeCommandUseCase,
  ) {}

  @Post()
  @HttpCode(202)
  create(
    @Req() request: DeviceRequest,
    @Body(new SchemaValidationPipe(createAccessSessionSchema))
    input: CreateAccessSession,
  ) {
    return this.createSession.execute(request.device!, input);
  }

  @Get(":sessionId")
  @UseGuards(DeviceSessionOwnershipGuard)
  poll(
    @Req() request: DeviceRequest,
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
  ) {
    return this.pollSession.execute(request.device!, sessionId);
  }

  @Post(":sessionId/ack")
  @HttpCode(204)
  @UseGuards(DeviceSessionOwnershipGuard)
  async acknowledge(
    @Req() request: DeviceRequest,
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
    @Body(new SchemaValidationPipe(acknowledgeCommandSchema))
    input: AcknowledgeCommand,
  ) {
    await this.acknowledgeCommand.execute(request.device!, sessionId, input);
  }
}
