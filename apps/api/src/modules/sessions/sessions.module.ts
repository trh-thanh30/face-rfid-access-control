import { Module } from "@nestjs/common";
import { CLOCK_PORT, SystemClock } from "../../common/clock/clock.port";
import { AccessManagementModule } from "../access-management/access-management.module";
import { DevicesModule } from "../devices/devices.module";
import { FACE_VERIFIER_PORT } from "./face-verifier/face-verifier.port";
import { FakeFaceVerifierAdapter } from "./face-verifier/fake-face-verifier.adapter";
import { PrismaSessionRepository } from "./repository/prisma-session.repository";
import { SESSION_REPOSITORY } from "./repository/session.repository.interface";
import { SessionsController } from "./sessions.controller";
import {
  AcknowledgeCommandUseCase,
  CreateAccessSessionUseCase,
  PollAccessSessionUseCase,
} from "./use-cases/session.use-cases";

@Module({
  imports: [AccessManagementModule, DevicesModule],
  controllers: [SessionsController],
  providers: [
    SystemClock,
    { provide: CLOCK_PORT, useExisting: SystemClock },
    PrismaSessionRepository,
    { provide: SESSION_REPOSITORY, useExisting: PrismaSessionRepository },
    FakeFaceVerifierAdapter,
    { provide: FACE_VERIFIER_PORT, useExisting: FakeFaceVerifierAdapter },
    CreateAccessSessionUseCase,
    PollAccessSessionUseCase,
    AcknowledgeCommandUseCase,
  ],
  exports: [SESSION_REPOSITORY],
})
export class SessionsModule {}
