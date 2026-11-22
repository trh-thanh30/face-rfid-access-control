import { Module } from "@nestjs/common";
import { PeopleController } from "./people.controller";
import { PERSON_REPOSITORY } from "./repository/person.repository.interface";
import { PrismaPersonRepository } from "./repository/prisma-person.repository";
import {
  CreatePersonUseCase,
  DisablePersonUseCase,
  GetPersonUseCase,
  ListPeopleUseCase,
  UpdatePersonUseCase,
} from "./use-cases/people.use-cases";

@Module({
  controllers: [PeopleController],
  providers: [
    PrismaPersonRepository,
    { provide: PERSON_REPOSITORY, useExisting: PrismaPersonRepository },
    CreatePersonUseCase,
    UpdatePersonUseCase,
    DisablePersonUseCase,
    GetPersonUseCase,
    ListPeopleUseCase,
  ],
  exports: [PERSON_REPOSITORY],
})
export class PeopleModule {}
