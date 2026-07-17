import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonActivityForm } from "@/components/admin/person-activity-form";
import { requireRole } from "@/lib/auth";
import { getAdminPerson, getPersonActivity } from "@/lib/people/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updatePersonActivityAction } from "../../../../activity-actions";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string; activityId: string }>;
};

export default async function EditPersonActivityPage({ params }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const { id, activityId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: person }, { data: activity }] = await Promise.all([
    getAdminPerson(supabase, id),
    getPersonActivity(supabase, id, activityId)
  ]);
  if (!person || !activity) notFound();

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 920 }}>
        <div className="card">
          <div className="card-body">
            <h1>編輯聯絡紀錄</h1>
            <p className="muted">客戶：{person.display_name}</p>
            <PersonActivityForm
              action={updatePersonActivityAction.bind(null, person.id, activity.id)}
              activity={activity}
            />
            <div className="actions">
              <Link className="button ghost" href={`/admin/people/${person.id}#activity-timeline`}>返回 Timeline</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
