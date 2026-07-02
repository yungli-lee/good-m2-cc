import Link from "next/link";
import { notFound } from "next/navigation";
import { PeopleForm } from "@/components/admin/people-form";
import { requireRole } from "@/lib/auth";
import { getAdminPerson, listPeopleAssignees } from "@/lib/people/queries";
import type { PersonFormState } from "@/lib/people/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updatePersonAction } from "../../actions";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPersonPage({ params }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: person }, { data: assignees }] = await Promise.all([
    getAdminPerson(supabase, id),
    listPeopleAssignees(supabase)
  ]);
  if (!person) notFound();

  const initialState: PersonFormState = {
    values: {
      display_name: person.display_name,
      legal_name: person.legal_name || "",
      phone: person.phone || "",
      line_id: person.line_id || "",
      email: person.email || "",
      source: person.source,
      status: person.status,
      assigned_to: person.assigned_to || "",
      notes: person.notes || "",
      roles: person.roles
    },
    fieldErrors: {}
  };

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 920 }}>
        <div className="card">
          <div className="card-body">
            <h1 style={{ marginTop: 0 }}>編輯客戶</h1>
            <p className="muted">更新 People 主檔與角色；不建立需求、追蹤或媒合資料。</p>
            <PeopleForm
              action={updatePersonAction.bind(null, person.id)}
              initialState={initialState}
              assignees={assignees || []}
              submitLabel="儲存客戶"
              pendingLabel="儲存中..."
            />
            <div className="actions" style={{ marginTop: 16 }}>
              <Link className="button ghost" href={`/admin/people/${person.id}`}>返回詳細頁</Link>
              <Link className="button ghost" href="/admin/people">返回列表</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
