import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma/prisma.service";

@Controller("v1/health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("live")
  live() {
    return { status: "ok", service: "access-control-api" };
  }

  @Get("ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ready", database: "up" };
    } catch {
      throw new ServiceUnavailableException({
        status: "not-ready",
        database: "down",
      });
    }
  }
}
