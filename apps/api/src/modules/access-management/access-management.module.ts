import { Module } from "@nestjs/common";
import { PeopleModule } from "../people/people.module";
import {
  AccessGrantController,
  RfidCredentialController,
} from "./access-management.controller";
import { RfidIdentityService } from "./domain/rfid-identity";
import {
  ACCESS_GRANT_REPOSITORY,
  RFID_CREDENTIAL_REPOSITORY,
} from "./repository/access-management.repository.interface";
import {
  PrismaAccessGrantRepository,
  PrismaRfidCredentialRepository,
} from "./repository/prisma-access-management.repository";
import {
  AttachRfidCredentialUseCase,
  CheckAccessEligibilityUseCase,
  CreateAccessGrantUseCase,
  GetAccessGrantUseCase,
  ListAccessGrantsUseCase,
  RevokeAccessGrantUseCase,
  RevokeRfidCredentialUseCase,
  UpdateAccessGrantUseCase,
} from "./use-cases/access-management.use-cases";

@Module({
  imports: [PeopleModule],
  controllers: [RfidCredentialController, AccessGrantController],
  providers: [
    RfidIdentityService,
    PrismaRfidCredentialRepository,
    PrismaAccessGrantRepository,
    {
      provide: RFID_CREDENTIAL_REPOSITORY,
      useExisting: PrismaRfidCredentialRepository,
    },
    {
      provide: ACCESS_GRANT_REPOSITORY,
      useExisting: PrismaAccessGrantRepository,
    },
    AttachRfidCredentialUseCase,
    RevokeRfidCredentialUseCase,
    CreateAccessGrantUseCase,
    UpdateAccessGrantUseCase,
    RevokeAccessGrantUseCase,
    GetAccessGrantUseCase,
    ListAccessGrantsUseCase,
    CheckAccessEligibilityUseCase,
  ],
  exports: [CheckAccessEligibilityUseCase],
})
export class AccessManagementModule {}
