import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import type {
  FaceTemplateReference,
  FaceTemplateRepository,
  NewFaceTemplate,
} from "./face-template.repository.interface";

type FaceTemplateRow = {
  id: string;
  embedding: string;
  model_version: string;
  pipeline_fingerprint: string;
};

@Injectable()
export class PrismaFaceTemplateRepository implements FaceTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByPersonId(
    personId: string,
  ): Promise<FaceTemplateReference[]> {
    const rows = await this.prisma.$queryRaw<FaceTemplateRow[]>(Prisma.sql`
      SELECT id, embedding::text AS embedding, model_version, pipeline_fingerprint
      FROM face_template
      WHERE person_id = ${personId}::uuid AND is_active = true
      ORDER BY created_at DESC, id ASC
      LIMIT 20
    `);
    return rows.map((row) => ({
      id: row.id,
      embedding: parseVector(row.embedding),
      modelVersion: row.model_version,
      pipelineFingerprint: row.pipeline_fingerprint,
    }));
  }

  async replaceActive(
    personId: string,
    templates: NewFaceTemplate[],
  ): Promise<number> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`
        UPDATE face_template SET is_active = false
        WHERE person_id = ${personId}::uuid AND is_active = true
      `);
      for (const template of templates) {
        const vector = `[${template.embedding.join(",")}]`;
        await transaction.$executeRaw(Prisma.sql`
          INSERT INTO face_template (
            id, person_id, embedding, model_version,
            pipeline_fingerprint, quality_score, is_active, created_at
          ) VALUES (
            gen_random_uuid(), ${personId}::uuid, ${vector}::vector,
            ${template.modelVersion}, ${template.pipelineFingerprint},
            ${template.qualityScore}, true, NOW()
          )
        `);
      }
    });
    return templates.length;
  }
}

function parseVector(value: string): number[] {
  if (!value.startsWith("[") || !value.endsWith("]")) {
    throw new Error("Invalid vector returned by database");
  }
  const parsed = value.slice(1, -1).split(",").map(Number);
  if (parsed.length === 0 || parsed.some((item) => !Number.isFinite(item))) {
    throw new Error("Invalid vector returned by database");
  }
  return parsed;
}
