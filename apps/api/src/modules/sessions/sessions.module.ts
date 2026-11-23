import { Module } from "@nestjs/common";
import { CLOCK_PORT, SystemClock } from "../../common/clock/clock.port";
import { AccessManagementModule } from "../access-management/access-management.module";
import { DevicesModule } from "../devices/devices.module";
import { FaceModule } from "../face/face.module";
import { PrismaSessionRepository } from "./repository/prisma-session.repository";
import { SESSION_REPOSITORY } from "./repository/session.repository.interface";
import { SessionsController } from "./sessions.controller";
import {
  AcknowledgeCommandUseCase,
  CreateAccessSessionUseCase,
  PollAccessSessionUseCase,
} from "./use-cases/session.use-cases";

@Module({
  imports: [AccessManagementModule, DevicesModule, FaceModule],
  controllers: [SessionsController],
  providers: [
    SystemClock,
    { provide: CLOCK_PORT, useExisting: SystemClock },
    PrismaSessionRepository,
    { provide: SESSION_REPOSITORY, useExisting: PrismaSessionRepository },
    CreateAccessSessionUseCase,
    PollAccessSessionUseCase,
    AcknowledgeCommandUseCase,
  ],
  exports: [SESSION_REPOSITORY],
})
export class SessionsModule {}
