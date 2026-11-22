import { Injectable } from "@nestjs/common";
import { Prisma, type Person } from "@prisma/client";
import type {
  CreatePersonInput,
  ListPeopleQuery,
  UpdatePersonInput,
} from "@access/shared";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  PersonCodeConflictError,
  type PaginatedPeople,
  type PersonRecord,
  type PersonRepository,
} from "./person.repository.interface";

@Injectable()
export class PrismaPersonRepository implements PersonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePersonInput): Promise<PersonRecord> {
    try {
      return mapPerson(
        await this.prisma.person.create({
          data: { code: input.code, full_name: input.fullName },
        }),
      );
    } catch (error) {
      throw mapConflict(error);
    }
  }

  async update(
    id: string,
    input: UpdatePersonInput,
  ): Promise<PersonRecord | null> {
    try {
      return mapPerson(
        await this.prisma.person.update({
          where: { id },
          data: { code: input.code, full_name: input.fullName },
        }),
      );
    } catch (error) {
      if (isNotFound(error)) return null;
      throw mapConflict(error);
    }
  }

  async disable(id: string): Promise<PersonRecord | null> {
    try {
      return mapPerson(
        await this.prisma.person.update({
          where: { id },
          data: { status: "DISABLED" },
        }),
      );
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async findById(id: string): Promise<PersonRecord | null> {
    const person = await this.prisma.person.findUnique({ where: { id } });
    return person ? mapPerson(person) : null;
  }

  async list(query: ListPeopleQuery): Promise<PaginatedPeople> {
    const where: Prisma.PersonWhereInput = {
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: "insensitive" } },
              { full_name: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.person.findMany({
        where,
        orderBy: [{ full_name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.person.count({ where }),
    ]);
    return {
      items: items.map(mapPerson),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}

function mapPerson(person: Person): PersonRecord {
  return {
    id: person.id,
    code: person.code,
    fullName: person.full_name,
    status: person.status,
    createdAt: person.created_at,
    updatedAt: person.updated_at,
  };
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

function mapConflict(error: unknown): unknown {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new PersonCodeConflictError("Person code already exists");
  }
  return error;
}
