import Link from "next/link";
import { notFound } from "next/navigation";
import { KnowledgeForm } from "@/components/admin/knowledge-form";
import { requireRole } from "@/lib/auth";
import { canEditKnowledge } from "@/lib/content/permissions";
import { getKnowledgeItem, listKnowledgeCategories } from "@/lib/content/queries";
import { updateKnowledgeAction } from "../../actions";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function EditKnowledgePage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const current = await requireRole(["editor", "admin", "owner"]);
  const [{ data: item }, categories] = await Promise.all([
    getKnowledgeItem(id),
    listKnowledgeCategories()
  ]);

  if (!item) notFound();

  const canEdit = canEditKnowledge(current.profile.role, item);
  const action = updateKnowledgeAction.bind(null, item.id);

  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Knowledge</p>
            <h1>編輯知識內容</h1>
            <p className="muted">{item.title}</p>
          </div>
          <Link className="button ghost" href="/admin/knowledge">返回知識管理</Link>
        </div>

        {query.saved ? <div className="success">知識內容已儲存。</div> : null}
        {query.error ? <div className="notice">儲存失敗：{query.error}</div> : null}
        {!canEdit ? <div className="notice">目前角色只能編輯草稿內容。</div> : null}

        <KnowledgeForm action={action} categories={categories} item={item} role={current.profile.role} disabled={!canEdit} />
      </div>
    </main>
  );
}

