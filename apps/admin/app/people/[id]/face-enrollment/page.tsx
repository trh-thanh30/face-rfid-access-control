import { FaceEnrollmentView } from "@/src/views/face-enrollment/face-enrollment.view";

export default async function FaceEnrollmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FaceEnrollmentView personId={id} />;
}
