import { notFound } from "next/navigation";
import { CustomerRequirementForm } from "@/components/admin/customer-requirement-form";
import { requireRole } from "@/lib/auth";
import { getRequirement } from "@/lib/customer-requirements/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";
type Props = { params: Promise<{ id: string }> };

export default async function EditRequirement({ params }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: requirement }, { data: profiles }] = await Promise.all([
    getRequirement(supabase, id),
    supabase.from("profiles").select("id,email,display_name").is("deleted_at", null).in("role", ["editor", "admin", "owner"])
  ]);
  if (!requirement) notFound();
  return <main className="section"><div className="container"><h1>編輯客需：{requirement.title}</h1><CustomerRequirementForm personId={requirement.person_id} requirementId={requirement.id} initial={requirement} assignees={(profiles || []).map((item) => ({ id: item.id, label: item.display_name || item.email || item.id }))} /></div></main>;
}
