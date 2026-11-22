import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreatePersonInput,
  ListPeopleQuery,
  UpdatePersonInput,
} from "@access/shared";
import {
  PERSON_REPOSITORY,
  PersonCodeConflictError,
  type PersonRepository,
} from "../repository/person.repository.interface";

abstract class PersonUseCaseBase {
  constructor(protected readonly people: PersonRepository) {}

  protected async translateConflict<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof PersonCodeConflictError) {
        throw new ConflictException("PERSON_CODE_ALREADY_EXISTS");
      }
      throw error;
    }
  }
}

@Injectable()
export class CreatePersonUseCase extends PersonUseCaseBase {
  constructor(@Inject(PERSON_REPOSITORY) people: PersonRepository) {
    super(people);
  }
  execute(input: CreatePersonInput) {
    return this.translateConflict(() => this.people.create(input));
  }
}

@Injectable()
export class UpdatePersonUseCase extends PersonUseCaseBase {
  constructor(@Inject(PERSON_REPOSITORY) people: PersonRepository) {
    super(people);
  }
  async execute(id: string, input: UpdatePersonInput) {
    const person = await this.translateConflict(() =>
      this.people.update(id, input),
    );
    if (!person) throw new NotFoundException("PERSON_NOT_FOUND");
    return person;
  }
}

@Injectable()
export class DisablePersonUseCase extends PersonUseCaseBase {
  constructor(@Inject(PERSON_REPOSITORY) people: PersonRepository) {
    super(people);
  }
  async execute(id: string) {
    const person = await this.people.disable(id);
    if (!person) throw new NotFoundException("PERSON_NOT_FOUND");
    return person;
  }
}

@Injectable()
export class GetPersonUseCase extends PersonUseCaseBase {
  constructor(@Inject(PERSON_REPOSITORY) people: PersonRepository) {
    super(people);
  }
  async execute(id: string) {
    const person = await this.people.findById(id);
    if (!person) throw new NotFoundException("PERSON_NOT_FOUND");
    return person;
  }
}

@Injectable()
export class ListPeopleUseCase extends PersonUseCaseBase {
  constructor(@Inject(PERSON_REPOSITORY) people: PersonRepository) {
    super(people);
  }
  execute(query: ListPeopleQuery) {
    return this.people.list(query);
  }
}
