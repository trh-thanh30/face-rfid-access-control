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
  summary(personId: string): Promise<{
    activeTemplateCount: number;
    modelVersion: string | null;
    pipelineFingerprint: string | null;
    meanQualityScore: number | null;
    lastEnrolledAt: Date | null;
  }>;
  deleteByPersonId(
    personId: string,
    actorAdminAccountId: string,
  ): Promise<number>;
}
