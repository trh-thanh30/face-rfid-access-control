import type { PersonRepository } from "../../people/repository/person.repository.interface";
import { DeleteFaceTemplatesUseCase } from "../delete-face-templates.use-case";
import type { FaceTemplateRepository } from "../face-template.repository.interface";

describe("DeleteFaceTemplatesUseCase", () => {
  it("hard-deletes biometric templates through an audited repository operation", async () => {
    const people = {
      findById: jest.fn().mockResolvedValue({ id: "person-id" }),
    } as unknown as PersonRepository;
    const templates = {
      deleteByPersonId: jest.fn().mockResolvedValue(4),
    } as unknown as FaceTemplateRepository;
    const result = await new DeleteFaceTemplatesUseCase(
      people,
      templates,
    ).execute("person-id", "admin-id");
    expect(result).toEqual({ personId: "person-id", deletedTemplateCount: 4 });
    expect(templates.deleteByPersonId).toHaveBeenCalledWith(
      "person-id",
      "admin-id",
    );
  });
});
