import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  propertyCategories,
  allowedPropertyCategories,
  propertyCategoryLabel,
  purchaseTimelines,
  requirementTypeLabels,
  requirementTypeLabel,
  requirementTypes,
  statusLabels,
  requirementStatuses,
  urgencyLabels,
  urgencyLevels,
} from "@/lib/customer-requirements/constants";
import { listRequirements } from "@/lib/customer-requirements/queries";
import { requirementListQuerySchema } from "@/lib/customer-requirements/schema";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Props = { searchParams: Promise<Record<string, string | undefined>> };
type RequirementListRow = {
  id: string;
  person_id: string;
  assigned_user_id: string | null;
  title: string;
  requirement_type: string;
  transaction_type: "buy" | "rent";
  property_categories: string[];
  cities: string[] | null;
  districts: string[] | null;
  area_note: string | null;
  sale_budget_min: number | null;
  sale_budget_max: number | null;
  rent_budget_min: number | null;
  rent_budget_max: number | null;
  bedrooms_min: number | null;
  urgency: keyof typeof urgencyLabels | null;
  status: keyof typeof statusLabels;
  updated_at: string;
  person?: { display_name: string } | null;
};

const timelineLabels: Record<(typeof purchaseTimelines)[number], string> = {
  immediate: "立即",
  within_1_month: "一個月內",
  within_3_months: "三個月內",
  within_6_months: "六個月內",
  within_1_year: "一年內",
  undecided: "未決定",
};
const sortLabels = { updated: "最近更新", newest: "最新建立", budget_asc: "預算由低到高", budget_desc: "預算由高到低" } as const;
const formatBudget = (row: RequirementListRow) => {
  const min = row.transaction_type === "buy" ? row.sale_budget_min : row.rent_budget_min;
  const max = row.transaction_type === "buy" ? row.sale_budget_max : row.rent_budget_max;
  const range = [min, max].map((value) => value == null ? null : `${Number(value) / 10_000}`).filter(Boolean).join("～");
  if (!range) return "-";
  return row.transaction_type === "buy" ? `${range} 萬` : `月租 ${range} 萬`;
};

export default async function RequirementsPage({ searchParams }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const raw = await searchParams;
  const parsed = requirementListQuerySchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : requirementListQuerySchema.parse({});
  const supabase = await createSupabaseServerClient();
  const [{ data, error, count }, { data: people }, { data: profiles }] = await Promise.all([
    listRequirements(supabase, filters),
    supabase.from("people").select("id,display_name,phone").is("deleted_at", null).order("display_name").limit(500),
    supabase.from("profiles").select("id,email,display_name").is("deleted_at", null).in("role", ["editor", "admin", "owner"]),
  ]);
  const profileLabels = new Map((profiles || []).map((profile) => [profile.id, profile.display_name || profile.email || profile.id]));
  const total = count || 0;
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const href = (page: number) => {
    const query = new URLSearchParams(Object.entries(raw).filter((entry): entry is [string, string] => Boolean(entry[1])));
    query.set("page", String(page));
    return `?${query}`;
  };

  return <main className="section"><div className="container">
    <div className="actions" style={{ justifyContent: "space-between" }}>
      <div><h1>客需中心</h1><p className="muted">集中搜尋所有客戶需求，供新進物件人工比對。共 {total} 筆。</p></div>
      <Link className="button" href="/admin/crm/requirements/new">新增客需</Link>
    </div>

    <form className="form-grid" aria-label="客需搜尋與篩選">
      <input type="hidden" name="page" value="1" />
      <label className="field full"><span>關鍵字</span><input className="input" name="search" defaultValue={filters.search} placeholder="客需名稱、客戶姓名、電話、區域或備註" /></label>
      <label className="field"><span>客戶</span><select className="select" name="personId" defaultValue={filters.personId || ""}><option value="">全部客戶</option>{(people || []).map((person) => <option key={person.id} value={person.id}>{person.display_name}{person.phone ? `｜${person.phone}` : ""}</option>)}</select></label>
      <label className="field"><span>交易</span><select className="select" name="transactionType" defaultValue={filters.transactionType || ""}><option value="">買／租皆可</option><option value="buy">購買</option><option value="rent">承租</option></select></label>
      <label className="field"><span>需求類型</span><select className="select" name="requirementType" defaultValue={filters.requirementType || ""}><option value="">全部</option>{requirementTypes.map((value) => <option key={value} value={value}>{requirementTypeLabels[value]}</option>)}</select></label>
      <label className="field"><span>物件類型</span><select className="select" name="propertyCategory" defaultValue={filters.propertyCategory || ""}><option value="">全部</option>{(filters.requirementType ? allowedPropertyCategories(filters.requirementType) : propertyCategories).map((value) => <option key={value} value={value}>{propertyCategoryLabel(value)}</option>)}</select></label>
      <label className="field"><span>縣市</span><input className="input" name="city" defaultValue={filters.city || ""} placeholder="例如：彰化縣" /></label>
      <label className="field"><span>行政區</span><input className="input" name="district" defaultValue={filters.district || ""} placeholder="例如：和美鎮" /></label>
      <label className="field"><span>預算下限至少（萬元）</span><input className="input" type="number" min="0" name="budgetMin" defaultValue={filters.budgetMin} /></label>
      <label className="field"><span>預算上限至多（萬元）</span><input className="input" type="number" min="0" name="budgetMax" defaultValue={filters.budgetMax} /></label>
      <label className="field"><span>狀態</span><select className="select" name="status" defaultValue={filters.status || ""}><option value="">全部</option>{requirementStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
      <label className="field"><span>急迫程度</span><select className="select" name="urgency" defaultValue={filters.urgency || ""}><option value="">全部</option>{urgencyLevels.map((value) => <option key={value} value={value}>{urgencyLabels[value]}</option>)}</select></label>
      <label className="field"><span>負責人</span><select className="select" name="assignedUserId" defaultValue={filters.assignedUserId || ""}><option value="">全部</option>{(profiles || []).map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name || profile.email || profile.id}</option>)}</select></label>
      <label className="field"><span>排序</span><select className="select" name="sort" defaultValue={filters.sort}>{Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>

      <details className="full"><summary>更多條件</summary><div className="form-grid" style={{ marginTop: 12 }}>
        <label className="field"><span>最低地坪（坪）</span><input className="input" type="number" min="0" name="landAreaMin" defaultValue={filters.landAreaMin} /></label>
        <label className="field"><span>最低建坪（坪）</span><input className="input" type="number" min="0" name="buildingAreaMin" defaultValue={filters.buildingAreaMin} /></label>
        <label className="field"><span>最少房數</span><input className="input" type="number" min="0" name="bedroomsMin" defaultValue={filters.bedroomsMin} /></label>
        <label className="field"><span>電梯</span><select className="select" name="elevator" defaultValue={filters.elevator || ""}><option value="">不限</option><option value="required">必要</option><option value="not_required">非必要</option></select></label>
        <label className="field"><span>車位</span><select className="select" name="parking" defaultValue={filters.parking || ""}><option value="">不限</option><option value="required">必要</option><option value="not_required">非必要</option></select></label>
        <label className="field"><span>購買時程</span><select className="select" name="purchaseTimeline" defaultValue={filters.purchaseTimeline || ""}><option value="">全部</option>{purchaseTimelines.map((value) => <option key={value} value={value}>{timelineLabels[value]}</option>)}</select></label>
        <label className="field"><span>建立日期起</span><input className="input" type="date" name="createdFrom" defaultValue={filters.createdFrom} /></label>
        <label className="field"><span>建立日期迄</span><input className="input" type="date" name="createdTo" defaultValue={filters.createdTo} /></label>
        <label className="field"><span>更新日期起</span><input className="input" type="date" name="updatedFrom" defaultValue={filters.updatedFrom} /></label>
        <label className="field"><span>更新日期迄</span><input className="input" type="date" name="updatedTo" defaultValue={filters.updatedTo} /></label>
        <label className="field"><span>每頁筆數</span><select className="select" name="pageSize" defaultValue={filters.pageSize}><option value="20">20</option><option value="50">50</option><option value="100">100</option></select></label>
      </div></details>
      {!parsed.success ? <div className="notice full" role="alert">部分搜尋條件格式錯誤，已顯示預設結果。</div> : null}
      <div className="actions full"><button className="button">搜尋客需</button><Link className="button ghost" href="/admin/crm/requirements">清除條件</Link></div>
    </form>

    {error ? <div className="notice" role="alert">客需讀取失敗，請稍後再試。</div> : null}
    <div className="table-wrap"><table><thead><tr><th>客戶／客需</th><th>交易／類型</th><th>區域／物件</th><th>預算／房數</th><th>急迫度／狀態</th><th>負責人</th><th>更新</th></tr></thead><tbody>
      {((data || []) as RequirementListRow[]).map((row) => <tr key={row.id}>
        <td><Link href={`/admin/people/${row.person_id}`}>{row.person?.display_name || row.person_id}</Link><br/><Link href={`/admin/crm/requirements/${row.id}`}><strong>{row.title}</strong></Link></td>
        <td>{row.transaction_type === "buy" ? "購買" : "承租"}／{requirementTypeLabel(row.requirement_type)}</td>
        <td>{[...(row.cities || []), ...(row.districts || [])].join("、") || row.area_note || "-"}<br/><span className="muted">{row.property_categories.map(propertyCategoryLabel).join("、")}</span></td>
        <td>{formatBudget(row)}<br/><span className="muted">{row.bedrooms_min == null ? "房數不限" : `${row.bedrooms_min} 房以上`}</span></td>
        <td>{row.urgency ? urgencyLabels[row.urgency] : "-"}／{statusLabels[row.status]}</td>
        <td>{row.assigned_user_id ? profileLabels.get(row.assigned_user_id) || row.assigned_user_id : "-"}</td>
        <td>{formatDateTime(row.updated_at)}</td>
      </tr>)}
      {!error && !data?.length ? <tr><td colSpan={7}><p className="muted">找不到符合條件的客需，請調整搜尋條件。</p></td></tr> : null}
    </tbody></table></div>
    <nav className="admin-users-pagination" aria-label="客需分頁">
      {filters.page > 1 ? <Link className="button ghost" href={href(filters.page - 1)}>上一頁</Link> : <span className="button ghost" aria-disabled="true">上一頁</span>}
      <span>第 {Math.min(filters.page, pages)}／{pages} 頁</span>
      {filters.page < pages ? <Link className="button ghost" href={href(filters.page + 1)}>下一頁</Link> : <span className="button ghost" aria-disabled="true">下一頁</span>}
    </nav>
  </div></main>;
}
