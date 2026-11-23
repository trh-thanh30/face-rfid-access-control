import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  listAccessEventsQuerySchema,
  type ListAccessEventsQuery,
} from "@access/shared";
import { SchemaValidationPipe } from "../../common/pipes/schema-validation.pipe";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import {
  GetDashboardUseCase,
  GetSessionTimelineUseCase,
  ListAccessEventsUseCase,
} from "./use-cases/admin-operations.use-cases";

@Controller("v1/admin")
@UseGuards(AdminJwtGuard)
export class AdminDashboardController {
  constructor(private readonly dashboard: GetDashboardUseCase) {}

  @Get("dashboard")
  get() {
    return this.dashboard.execute();
  }
}

@Controller("v1/access-events")
@UseGuards(AdminJwtGuard)
export class AccessEventsController {
  constructor(
    private readonly listEvents: ListAccessEventsUseCase,
    private readonly getTimeline: GetSessionTimelineUseCase,
  ) {}

  @Get()
  list(
    @Query(new SchemaValidationPipe(listAccessEventsQuerySchema))
    query: ListAccessEventsQuery,
  ) {
    return this.listEvents.execute(query);
  }

  @Get("sessions/:sessionId")
  timeline(@Param("sessionId", ParseUUIDPipe) sessionId: string) {
    return this.getTimeline.execute(sessionId);
  }
}
