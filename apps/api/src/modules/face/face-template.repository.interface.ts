export const FACE_TEMPLATE_REPOSITORY = Symbol("FACE_TEMPLATE_REPOSITORY");

export type FaceTemplateReference = {
  id: string;
  embedding: number[];
  modelVersion: string;
  pipelineFingerprint: string;
};

export type NewFaceTemplate = Omit<FaceTemplateReference, "id"> & {
  qualityScore: number;
};

export interface FaceTemplateRepository {
  findActiveByPersonId(personId: string): Promise<FaceTemplateReference[]>;
  replaceActive(
    personId: string,
    templates: NewFaceTemplate[],
  ): Promise<number>;
}
