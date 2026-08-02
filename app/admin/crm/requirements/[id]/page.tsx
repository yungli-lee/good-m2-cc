import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { requirementTypeLabels, statusLabels, urgencyLabels } from "@/lib/customer-requirements/constants";
import { getRequirement } from "@/lib/customer-requirements/queries";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CustomerRequirementActions } from "@/components/admin/customer-requirement-actions";
import { getRequirementCompleteness } from "@/lib/customer-requirements/completeness";

export const runtime = "edge";
type Props = { params: Promise<{ id: string }> };

export default async function RequirementDetail({ params }: Props) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: requirement } = await getRequirement(supabase, id);
  if (!requirement) notFound();
  const money = (value: unknown) => value == null ? "-" : `${Number(value) / 10000} 萬元`;
  const completeness = getRequirementCompleteness(requirement);

  return <main className="section"><div className="container">
    <div className="actions" style={{ justifyContent: "space-between" }}>
      <div><h1>{requirement.title}</h1><p className="muted">{requirement.person?.display_name}／{requirementTypeLabels[requirement.requirement_type as keyof typeof requirementTypeLabels]}</p></div>
      <div className="actions"><Link className="button ghost" href={`/admin/people/${requirement.person_id}#requirements`}>返回客戶</Link><Link className="button" href={`/admin/crm/requirements/${requirement.id}/edit`}>編輯</Link></div>
    </div>
    <section className="card"><div className="card-body"><dl className="company-info-panel">
      <div><dt>交易</dt><dd>{requirement.transaction_type === "buy" ? "購買" : "承租"}</dd></div>
      <div><dt>物件類型</dt><dd>{(requirement.property_categories || []).join("、")}</dd></div>
      <div><dt>區域</dt><dd>{[...(requirement.cities || []), ...(requirement.districts || [])].join("、") || requirement.area_note || "-"}</dd></div>
      <div><dt>預算</dt><dd>{requirement.transaction_type === "buy" ? money(requirement.sale_budget_max) : money(requirement.rent_budget_max)}</dd></div>
      <div><dt>急迫度</dt><dd>{urgencyLabels[requirement.urgency as keyof typeof urgencyLabels] || "-"}</dd></div>
      <div><dt>狀態</dt><dd>{statusLabels[requirement.status as keyof typeof statusLabels]}</dd></div>
      <div><dt>房數</dt><dd>{String(requirement.bedrooms_min || "-")}～{String(requirement.bedrooms_max || "不限")}</dd></div>
      <div><dt>地／建坪</dt><dd>{String(requirement.land_area_min || "-")}／{String(requirement.building_area_min || "-")}</dd></div>
      <div><dt>必要條件</dt><dd>{(requirement.must_have || []).join("、") || "-"}</dd></div>
      <div><dt>偏好</dt><dd>{(requirement.nice_to_have || []).join("、") || "-"}</dd></div>
      <div><dt>更新</dt><dd>{formatDateTime(requirement.updated_at)}</dd></div>
      <div><dt>最近匹配</dt><dd>{formatDateTime(requirement.last_matched_at)}</dd></div>
    </dl><h2>資料完整度</h2><div className="actions">{completeness.sections.map((section) => <span key={section.label} className={`admin-users-badge ${section.complete ? "is-active" : ""}`}>{section.label}：{section.complete ? "完整" : `待補（${section.missing.join("、")}）`}</span>)}</div><h2>備註</h2><p style={{ whiteSpace: "pre-wrap" }}>{String(requirement.notes || "-")}</p><CustomerRequirementActions id={requirement.id} personId={requirement.person_id} status={requirement.status as never} canDelete={["admin", "owner"].includes(current.profile.role)} /></div></section>
  </div></main>;
}
