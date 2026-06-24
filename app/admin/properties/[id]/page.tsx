import { redirect } from "next/navigation";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminPropertyDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/properties/${id}/edit`);
}
