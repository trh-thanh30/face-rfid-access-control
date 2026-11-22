import type {
  CreatePersonInput,
  ListPeopleQuery,
  UpdatePersonInput,
} from "@access/shared";

export const PERSON_REPOSITORY = Symbol("PERSON_REPOSITORY");

export type PersonStatus = "ACTIVE" | "DISABLED";

export type PersonRecord = {
  id: string;
  code: string;
  fullName: string;
  status: PersonStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedPeople = {
  items: PersonRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export interface PersonRepository {
  create(input: CreatePersonInput): Promise<PersonRecord>;
  update(id: string, input: UpdatePersonInput): Promise<PersonRecord | null>;
  disable(id: string): Promise<PersonRecord | null>;
  findById(id: string): Promise<PersonRecord | null>;
  list(query: ListPeopleQuery): Promise<PaginatedPeople>;
}

export class PersonCodeConflictError extends Error {}
