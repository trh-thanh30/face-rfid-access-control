import { PersonDetailView } from "@/src/views/people/person-detail.view";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PersonDetailView personId={id} />;
}
