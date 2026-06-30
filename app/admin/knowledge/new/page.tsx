import Link from "next/link";
import { KnowledgeForm } from "@/components/admin/knowledge-form";
import { requireRole } from "@/lib/auth";
import { listKnowledgeCategories } from "@/lib/content/queries";
import { createKnowledgeAction } from "../actions";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewKnowledgePage({ searchParams }: Props) {
  const params = await searchParams;
  const current = await requireRole(["editor", "admin", "owner"]);
  const categories = await listKnowledgeCategories();

  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Knowledge</p>
            <h1>新增知識草稿</h1>
          </div>
          <Link className="button ghost" href="/admin/knowledge">返回知識管理</Link>
        </div>

        {params.error ? <div className="notice">新增失敗：{params.error}</div> : null}
        <KnowledgeForm action={createKnowledgeAction} categories={categories} role={current.profile.role} />
      </div>
    </main>
  );
}

