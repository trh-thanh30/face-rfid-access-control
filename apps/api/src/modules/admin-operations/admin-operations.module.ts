import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import {
  AccessEventsController,
  AdminDashboardController,
} from "./admin-operations.controller";
import { ADMIN_OPERATIONS_REPOSITORY } from "./repository/admin-operations.repository.interface";
import { PrismaAdminOperationsRepository } from "./repository/prisma-admin-operations.repository";
import {
  GetDashboardUseCase,
  GetSessionTimelineUseCase,
  ListAccessEventsUseCase,
} from "./use-cases/admin-operations.use-cases";

@Module({
  imports: [AuthModule],
  controllers: [AdminDashboardController, AccessEventsController],
  providers: [
    PrismaAdminOperationsRepository,
    {
      provide: ADMIN_OPERATIONS_REPOSITORY,
      useExisting: PrismaAdminOperationsRepository,
    },
    GetDashboardUseCase,
    ListAccessEventsUseCase,
    GetSessionTimelineUseCase,
  ],
})
export class AdminOperationsModule {}
