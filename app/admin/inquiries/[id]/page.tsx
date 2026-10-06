import { notFound } from "next/navigation";
import { canMarkInquirySpam, requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InquiryActions } from "@/components/admin/inquiry-actions";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function InquiryDetailPage({ params, searchParams }: Props) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("inquiries").select("*, properties(title, slug)").eq("id", id).maybeSingle();
  if (error || !data) notFound();

  return (
    <main className="section">
      <div className="container">
        <h1>詢問單詳細內容</h1>
        {query.saved ? <div className="notice">已儲存。</div> : null}
        {query.error ? <div className="notice">操作失敗：{query.error}</div> : null}
        <div className="card">
          <div className="card-body">
            <p>送出時間：{formatDateTime(data.created_at)}</p>
            <p>表單類型：{data.form_type}</p>
            <p>姓名：{data.name || "-"}</p>
            <p>手機：{data.phone || "-"}</p>
            <p>Email：{data.email || "-"}</p>
            <p>來源頁面：{data.source_page || "-"}</p>
            <p>相關物件：{data.properties?.title || "-"}</p>
            <p>狀態：{data.status}</p>
            <h2>詢問內容</h2>
            <p style={{ whiteSpace: "pre-line" }}>{data.message || "-"}</p>
            <InquiryActions
              inquiryId={data.id}
              initialStatus={data.status}
              initialNote={data.internal_note || ""}
              canMarkSpam={canMarkInquirySpam(current.profile.role)}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
