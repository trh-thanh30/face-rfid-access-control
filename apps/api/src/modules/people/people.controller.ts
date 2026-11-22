import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  createPersonSchema,
  listPeopleQuerySchema,
  updatePersonSchema,
  type CreatePersonInput,
  type ListPeopleQuery,
  type UpdatePersonInput,
} from "@access/shared";
import { SchemaValidationPipe } from "../../common/pipes/schema-validation.pipe";
import {
  CreatePersonUseCase,
  DisablePersonUseCase,
  GetPersonUseCase,
  ListPeopleUseCase,
  UpdatePersonUseCase,
} from "./use-cases/people.use-cases";

@Controller("people")
export class PeopleController {
  constructor(
    private readonly createPerson: CreatePersonUseCase,
    private readonly updatePerson: UpdatePersonUseCase,
    private readonly disablePerson: DisablePersonUseCase,
    private readonly getPerson: GetPersonUseCase,
    private readonly listPeople: ListPeopleUseCase,
  ) {}

  @Post()
  create(
    @Body(new SchemaValidationPipe(createPersonSchema))
    input: CreatePersonInput,
  ) {
    return this.createPerson.execute(input);
  }

  @Get()
  list(
    @Query(new SchemaValidationPipe(listPeopleQuerySchema))
    query: ListPeopleQuery,
  ) {
    return this.listPeople.execute(query);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getPerson.execute(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new SchemaValidationPipe(updatePersonSchema))
    input: UpdatePersonInput,
  ) {
    return this.updatePerson.execute(id, input);
  }

  @Patch(":id/disable")
  disable(@Param("id", ParseUUIDPipe) id: string) {
    return this.disablePerson.execute(id);
  }
}
