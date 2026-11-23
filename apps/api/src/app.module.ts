import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./config/env";
import { PrismaModule } from "./database/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { AccessManagementModule } from "./modules/access-management/access-management.module";
import { PeopleModule } from "./modules/people/people.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { SessionsModule } from "./modules/sessions/sessions.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    PeopleModule,
    AccessManagementModule,
    DevicesModule,
    SessionsModule,
  ],
})
export class AppModule {}
