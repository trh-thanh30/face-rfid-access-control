import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  createAccessPointSchema,
  deviceHeartbeatSchema,
  listDevicesQuerySchema,
  registerDeviceSchema,
  type CreateAccessPointInput,
  type DeviceHeartbeat,
  type ListDevicesQuery,
  type RegisterDeviceInput,
} from "@access/shared";
import { SchemaValidationPipe } from "../../common/pipes/schema-validation.pipe";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import {
  DeviceAuthGuard,
  type DeviceRequest,
} from "./guards/device-auth.guard";
import { ContractVersionGuard } from "./guards/contract-version.guard";
import {
  CreateAccessPointUseCase,
  DisableDeviceUseCase,
  GetDeviceUseCase,
  ListAccessPointsUseCase,
  ListDevicesUseCase,
  RecordHeartbeatUseCase,
  RegisterDeviceUseCase,
  RotateDeviceCredentialUseCase,
} from "./use-cases/device.use-cases";

@Controller("device/v1")
@UseGuards(ContractVersionGuard, DeviceAuthGuard)
export class DeviceApiController {
  constructor(private readonly recordHeartbeat: RecordHeartbeatUseCase) {}

  @Post("heartbeat")
  @HttpCode(204)
  async heartbeat(
    @Req() request: DeviceRequest,
    @Body(new SchemaValidationPipe(deviceHeartbeatSchema))
    input: DeviceHeartbeat,
  ) {
    await this.recordHeartbeat.execute(request.device!, input);
  }
}

@Controller("v1/devices")
@UseGuards(AdminJwtGuard)
export class DevicesAdminController {
  constructor(
    private readonly registerDevice: RegisterDeviceUseCase,
    private readonly rotateCredential: RotateDeviceCredentialUseCase,
    private readonly disableDevice: DisableDeviceUseCase,
    private readonly getDevice: GetDeviceUseCase,
    private readonly listDevices: ListDevicesUseCase,
  ) {}

  @Post()
  create(
    @Body(new SchemaValidationPipe(registerDeviceSchema))
    input: RegisterDeviceInput,
  ) {
    return this.registerDevice.execute(input);
  }

  @Get()
  list(
    @Query(new SchemaValidationPipe(listDevicesQuerySchema))
    query: ListDevicesQuery,
  ) {
    return this.listDevices.execute(query);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getDevice.execute(id);
  }

  @Post(":id/rotate-credential")
  rotate(@Param("id", ParseUUIDPipe) id: string) {
    return this.rotateCredential.execute(id);
  }

  @Patch(":id/disable")
  disable(@Param("id", ParseUUIDPipe) id: string) {
    return this.disableDevice.execute(id);
  }
}

@Controller("v1/access-points")
@UseGuards(AdminJwtGuard)
export class AccessPointsAdminController {
  constructor(
    private readonly createAccessPoint: CreateAccessPointUseCase,
    private readonly listAccessPoints: ListAccessPointsUseCase,
  ) {}

  @Post()
  create(
    @Body(new SchemaValidationPipe(createAccessPointSchema))
    input: CreateAccessPointInput,
  ) {
    return this.createAccessPoint.execute(input);
  }

  @Get()
  list() {
    return this.listAccessPoints.execute();
  }
}
