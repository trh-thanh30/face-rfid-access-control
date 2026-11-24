import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PERSON_REPOSITORY,
  type PersonRepository,
} from "../people/repository/person.repository.interface";
import {
  FACE_TEMPLATE_REPOSITORY,
  type FaceTemplateRepository,
} from "./face-template.repository.interface";

@Injectable()
export class DeleteFaceTemplatesUseCase {
  constructor(
    @Inject(PERSON_REPOSITORY) private readonly people: PersonRepository,
    @Inject(FACE_TEMPLATE_REPOSITORY)
    private readonly templates: FaceTemplateRepository,
  ) {}

  async execute(personId: string, actorAdminAccountId: string) {
    if (!(await this.people.findById(personId))) {
      throw new NotFoundException("PERSON_NOT_FOUND");
    }
    return {
      personId,
      deletedTemplateCount: await this.templates.deleteByPersonId(
        personId,
        actorAdminAccountId,
      ),
    };
  }
}
