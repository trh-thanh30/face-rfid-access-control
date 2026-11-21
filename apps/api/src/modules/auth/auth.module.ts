import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { ADMIN_ACCOUNT_REPOSITORY } from "./repository/admin-account.repository.interface";
import { PrismaAdminAccountRepository } from "./repository/prisma-admin-account.repository";
import { LoginUseCase } from "./use-cases/login.use-case";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: config.get<string>("JWT_EXPIRES_IN", "1h") as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    PrismaAdminAccountRepository,
    {
      provide: ADMIN_ACCOUNT_REPOSITORY,
      useExisting: PrismaAdminAccountRepository,
    },
  ],
})
export class AuthModule {}
