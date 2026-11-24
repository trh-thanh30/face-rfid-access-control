import type { PrismaService } from "../../../database/prisma/prisma.service";
import { PrismaFaceTemplateRepository } from "../prisma-face-template.repository";

describe("Face Template privacy boundary", () => {
  it("returns only aggregate metadata to Admin responses", async () => {
    const prisma = {
      faceTemplate: {
        aggregate: jest.fn().mockResolvedValue({
          _count: { id: 3 },
          _avg: { quality_score: 0.81 },
          _max: { created_at: new Date("2026-11-24T00:00:00Z") },
        }),
        findFirst: jest.fn().mockResolvedValue({
          model_version: "model-v1",
          pipeline_fingerprint: "pipeline-v1",
        }),
      },
    } as unknown as PrismaService;
    const result = await new PrismaFaceTemplateRepository(prisma).summary(
      "person-id",
    );
    expect(result).not.toHaveProperty("embedding");
    expect(JSON.stringify(result)).not.toContain("[");
  });

  it("hard-deletes templates and records only actor/count in audit metadata", async () => {
    const transaction = {
      faceTemplate: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      adminAuditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((operation) => operation(transaction)),
    } as unknown as PrismaService;
    await expect(
      new PrismaFaceTemplateRepository(prisma).deleteByPersonId(
        "person-id",
        "admin-id",
      ),
    ).resolves.toBe(2);
    expect(transaction.adminAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_admin_account_id: "admin-id",
        action: "FACE_TEMPLATES_DELETED",
        metadata: { deletedTemplateCount: 2 },
      }),
    });
  });
});
