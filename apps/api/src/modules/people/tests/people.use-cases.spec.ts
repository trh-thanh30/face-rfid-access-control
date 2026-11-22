import { ConflictException, NotFoundException } from "@nestjs/common";
import {
  PersonCodeConflictError,
  type PersonRepository,
} from "../repository/person.repository.interface";
import {
  CreatePersonUseCase,
  DisablePersonUseCase,
} from "../use-cases/people.use-cases";

describe("people use cases", () => {
  it("maps duplicate person code to a stable conflict", async () => {
    const repository = {
      create: jest.fn().mockRejectedValue(new PersonCodeConflictError()),
    } as unknown as PersonRepository;
    await expect(
      new CreatePersonUseCase(repository).execute({
        code: "P001",
        fullName: "Person",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("reports a missing person when disabling", async () => {
    const repository = {
      disable: jest.fn().mockResolvedValue(null),
    } as unknown as PersonRepository;
    await expect(
      new DisablePersonUseCase(repository).execute("missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
