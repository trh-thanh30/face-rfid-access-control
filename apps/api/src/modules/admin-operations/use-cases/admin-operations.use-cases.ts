import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ListAccessEventsQuery } from "@access/shared";
import {
  ADMIN_OPERATIONS_REPOSITORY,
  type AdminOperationsRepository,
} from "../repository/admin-operations.repository.interface";

@Injectable()
export class GetDashboardUseCase {
  private readonly offlineThresholdMs: number;

  constructor(
    @Inject(ADMIN_OPERATIONS_REPOSITORY)
    private readonly repository: AdminOperationsRepository,
    config: ConfigService,
  ) {
    this.offlineThresholdMs =
      config.getOrThrow<number>("DEVICE_OFFLINE_THRESHOLD_SECONDS") * 1000;
  }

  async execute(now = new Date()) {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const result = await this.repository.dashboard(startOfDay);
    const onlineDevices = result.activeDevices.filter(
      (device) =>
        device.lastSeenAt &&
        now.getTime() - device.lastSeenAt.getTime() <= this.offlineThresholdMs,
    ).length;
    return {
      activePeople: result.activePeople,
      onlineDevices,
      offlineDevices: result.activeDevices.length - onlineDevices,
      allowedToday: result.allowedToday,
      deniedToday: result.deniedToday,
      recentEvents: result.recentEvents,
      generatedAt: now,
    };
  }
}

@Injectable()
export class ListAccessEventsUseCase {
  constructor(
    @Inject(ADMIN_OPERATIONS_REPOSITORY)
    private readonly repository: AdminOperationsRepository,
  ) {}

  execute(query: ListAccessEventsQuery) {
    return this.repository.listEvents(query);
  }
}

@Injectable()
export class GetSessionTimelineUseCase {
  constructor(
    @Inject(ADMIN_OPERATIONS_REPOSITORY)
    private readonly repository: AdminOperationsRepository,
  ) {}

  async execute(sessionId: string) {
    const timeline = await this.repository.sessionTimeline(sessionId);
    if (!timeline) throw new NotFoundException("AUTH_SESSION_NOT_FOUND");
    return timeline;
  }
}
