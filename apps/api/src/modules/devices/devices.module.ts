import { Module } from "@nestjs/common";
import { CLOCK_PORT, SystemClock } from "../../common/clock/clock.port";
import { AuthModule } from "../auth/auth.module";
import {
  AccessPointsAdminController,
  DeviceApiController,
  DevicesAdminController,
} from "./devices.controller";
import { DeviceAuthGuard } from "./guards/device-auth.guard";
import { ContractVersionGuard } from "./guards/contract-version.guard";
import { DeviceSessionOwnershipGuard } from "./guards/device-session-ownership.guard";
import { DEVICE_REPOSITORY } from "./repository/device.repository.interface";
import { PrismaDeviceRepository } from "./repository/prisma-device.repository";
import {
  CreateAccessPointUseCase,
  DeviceAuthenticationService,
  DevicePresencePolicy,
  DisableDeviceUseCase,
  GetDeviceUseCase,
  ListAccessPointsUseCase,
  ListDevicesUseCase,
  RecordHeartbeatUseCase,
  RegisterDeviceUseCase,
  RotateDeviceCredentialUseCase,
} from "./use-cases/device.use-cases";

@Module({
  imports: [AuthModule],
  controllers: [
    DeviceApiController,
    DevicesAdminController,
    AccessPointsAdminController,
  ],
  providers: [
    SystemClock,
    { provide: CLOCK_PORT, useExisting: SystemClock },
    PrismaDeviceRepository,
    { provide: DEVICE_REPOSITORY, useExisting: PrismaDeviceRepository },
    DeviceAuthenticationService,
    DevicePresencePolicy,
    DeviceAuthGuard,
    ContractVersionGuard,
    DeviceSessionOwnershipGuard,
    RegisterDeviceUseCase,
    RotateDeviceCredentialUseCase,
    DisableDeviceUseCase,
    GetDeviceUseCase,
    ListDevicesUseCase,
    RecordHeartbeatUseCase,
    CreateAccessPointUseCase,
    ListAccessPointsUseCase,
  ],
  exports: [
    ContractVersionGuard,
    DeviceAuthGuard,
    DeviceSessionOwnershipGuard,
    DEVICE_REPOSITORY,
  ],
})
export class DevicesModule {}
