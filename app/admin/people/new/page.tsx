import Link from "next/link";
import { PeopleForm } from "@/components/admin/people-form";
import { requireRole } from "@/lib/auth";
import { listPeopleAssignees } from "@/lib/people/queries";
import { defaultPersonFormValues } from "@/lib/people/schema";
import type { PersonFormState } from "@/lib/people/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPersonAction } from "../actions";

export const runtime = "edge";

export default async function NewPersonPage() {
  await requireRole(["editor", "admin", "owner"]);
  const supabase = await createSupabaseServerClient();
  const { data: assignees } = await listPeopleAssignees(supabase);
  const initialState: PersonFormState = {
    values: defaultPersonFormValues(),
    fieldErrors: {}
  };

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 920 }}>
        <div className="card">
          <div className="card-body">
            <h1 style={{ marginTop: 0 }}>新增客戶</h1>
            <p className="muted">建立 People 主檔與角色，不建立需求、追蹤或媒合資料。</p>
            <PeopleForm
              action={createPersonAction}
              initialState={initialState}
              assignees={assignees || []}
              submitLabel="建立客戶"
              pendingLabel="建立中..."
            />
            <div className="actions" style={{ marginTop: 16 }}>
              <Link className="button ghost" href="/admin/people">返回客戶列表</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
