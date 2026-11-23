import { ConfigService } from "@nestjs/config";
import type { AdminOperationsRepository } from "../repository/admin-operations.repository.interface";
import { GetDashboardUseCase } from "../use-cases/admin-operations.use-cases";

describe("GetDashboardUseCase", () => {
  it("calculates presence on the server using the configured threshold", async () => {
    const now = new Date("2026-11-23T10:00:00+07:00");
    const repository = {
      dashboard: jest.fn().mockResolvedValue({
        activePeople: 4,
        activeDevices: [
          {
            id: "online",
            deviceCode: "DOOR_01",
            lastSeenAt: new Date(now.getTime() - 10_000),
          },
          {
            id: "offline",
            deviceCode: "DOOR_02",
            lastSeenAt: new Date(now.getTime() - 31_000),
          },
          { id: "never", deviceCode: "DOOR_03", lastSeenAt: null },
        ],
        allowedToday: 9,
        deniedToday: 2,
        recentEvents: [],
      }),
    } as unknown as AdminOperationsRepository;
    const useCase = new GetDashboardUseCase(
      repository,
      new ConfigService({ DEVICE_OFFLINE_THRESHOLD_SECONDS: 30 }),
    );

    const result = await useCase.execute(now);

    expect(result).toMatchObject({
      activePeople: 4,
      onlineDevices: 1,
      offlineDevices: 2,
      allowedToday: 9,
      deniedToday: 2,
    });
  });
});
