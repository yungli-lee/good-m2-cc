import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const kindLabel = (kind: string) => ({ sale: "買賣", presale: "預售", rental: "租賃" }[kind] || kind);
const number = (value: number | null | undefined) => (value ?? 0).toLocaleString("zh-TW");
const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "尚無紀錄";

type RawFile = { file_name: string; dataset_code: string | null; row_kind: string | null; expected_rows: number | null; imported_rows: number | null; imported_at: string | null };
type Readiness = { county: string; dataset_type: string; status: string; verified_at: string | null; coverage_start: string | null; coverage_end: string | null };
type Batch = { id: number; source_file: string | null; status: string; imported_rows: number | null; rejected_rows: number | null; created_at: string | null };
type Checkpoint = { county_code: string; dataset_type: string; processed_masters: number | null; processed_details: number | null; updated_at: string | null };
type Archive = { archive_name: string; validation_status: string; expected_master_rows: number | null; expected_detail_rows: number | null; created_at: string | null };

export default async function AdminRealPricePage() {
  await requireRole(["editor", "admin", "owner"]);
  const supabase = await createSupabaseServerClient();
  const [transactions, details, rawFiles, readiness, batches, checkpoints, archives, countySources] = await Promise.all([
    supabase.from("moi_real_price_transactions").select("id", { count: "exact", head: true }),
    supabase.from("moi_transaction_details").select("id", { count: "exact", head: true }),
    supabase.from("moi_raw_csv_files").select("file_name,dataset_code,row_kind,expected_rows,imported_rows,imported_at").order("id", { ascending: false }).limit(2000),
    supabase.from("moi_county_dataset_readiness").select("county,dataset_type,status,verified_at,coverage_start,coverage_end").eq("county", "彰化縣"),
    supabase.from("moi_transaction_import_batches").select("id,source_file,status,imported_rows,rejected_rows,created_at").order("id", { ascending: false }).limit(10),
    supabase.from("moi_import_checkpoints").select("county_code,dataset_type,processed_masters,processed_details,updated_at").order("updated_at", { ascending: false }).limit(10),
    supabase.from("moi_source_archives").select("archive_name,validation_status,expected_master_rows,expected_detail_rows,created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("moi_county_sources").select("county,collect_enabled,publish_enabled,historical_status").eq("county","彰化縣").maybeSingle(),
  ]);
  const errors = [transactions, details, rawFiles, readiness, batches, checkpoints, archives, countySources]
    .map(x => x.error?.message).filter((x): x is string => Boolean(x));
  const files = (rawFiles.data || []) as RawFile[];
  const unfinished = files.filter(x => x.expected_rows === null || x.imported_rows === null || x.imported_rows < x.expected_rows);
  const mismatched = files.filter(x => x.expected_rows !== null && x.imported_rows !== null && x.expected_rows !== x.imported_rows);
  const expected = files.reduce((sum, x) => sum + (x.expected_rows || 0), 0);
  const imported = files.reduce((sum, x) => sum + (x.imported_rows || 0), 0);
  const maxDate = files.map(x => x.imported_at).filter((x): x is string => Boolean(x)).sort().at(-1);
  const status = (readiness.data || []) as Readiness[];
  const pendingVerification = status.some(x => x.status !== "verified");
  const sources = countySources.data;

  return (
    <main className="section">
      <div className="container">
        <h1>實價登錄管理</h1>
        <p className="muted">資料匯入檢查與追蹤（唯讀）。資料量不等於官方來源完整度；目前不提供一鍵重新匯入，以免重複或覆寫歷史交易。</p>
        {errors.length ? <div className="notice" role="alert"><strong>部分監控資訊無法讀取，以下數字可能不完整。</strong><p>{Array.from(new Set(errors)).join("；")}</p></div> : null}
        <div className="people-summary-grid" style={{ marginBottom: 18 }}>
          <article className="card"><div className="card-body"><h2>交易主檔</h2><strong style={{ fontSize: "1.7rem" }}>{transactions.error ? "無法讀取" : number(transactions.count)}</strong><p className="muted">目前資料庫紀錄數，非官方完整數</p></div></article>
          <article className="card"><div className="card-body"><h2>交易明細</h2><strong style={{ fontSize: "1.7rem" }}>{details.error ? "無法讀取" : number(details.count)}</strong><p className="muted">土地／建物／車位明細</p></div></article>
          <article className="card"><div className="card-body"><h2>原始檔案紀錄</h2><strong style={{ fontSize: "1.7rem" }}>{rawFiles.error ? "無法讀取" : number(files.length)}</strong><p className="muted">只列最近 2,000 筆紀錄</p></div></article>
          <article className="card"><div className="card-body"><h2>最後檔案匯入</h2><strong>{rawFiles.error ? "無法讀取" : dateTime(maxDate)}</strong><p className="muted">依檔案紀錄的 imported_at</p></div></article>
        </div>
        <section className="card" style={{ marginBottom: 18 }}><div className="card-body">
          <h2>資料完整度與公開狀態</h2>
          <p><strong>{readiness.error ? "無法確認完整度" : pendingVerification || status.length !== 3 ? "尚未完成完整度驗證" : "資料集狀態均標記已驗證"}</strong></p>
          <p className="muted">彰化縣資料收集：{sources ? (sources.collect_enabled ? "啟用" : "停用") : "未知"}；公開：{sources ? (sources.publish_enabled ? "啟用" : "停用") : "未知"}；歷史補齊狀態：{sources?.historical_status || "未知"}</p>
          <div style={{ overflowX: "auto" }}><table style={{ width:"100%" }}><thead><tr><th>資料類型</th><th>驗證狀態</th><th>涵蓋期間（已登錄）</th><th>完成驗證時間</th></tr></thead><tbody>
            {["sale","presale","rental"].map(kind => { const row = status.find(x => x.dataset_type === kind); return <tr key={kind}><td>{kindLabel(kind)}</td><td>{row?.status || "無紀錄"}</td><td>{row?.coverage_start || "未確認"} ～ {row?.coverage_end || "未確認"}</td><td>{dateTime(row?.verified_at)}</td></tr>; })}
          </tbody></table></div>
          <p className="muted">「未驗證」不等於確定缺漏；需要比對官方歷史檔案、檔案雜湊、來源筆數與資料庫實際鍵值，才能判定補齊完成。</p>
        </div></section>
        <section className="card" style={{ marginBottom: 18 }}><div className="card-body">
          <h2>CSV 匯入數量核對</h2>
          <p>檔案登錄預期列數：<strong>{number(expected)}</strong>；記錄已匯入列數：<strong>{number(imported)}</strong>；數量不一致檔案：<strong>{number(mismatched.length)}</strong>；待核對檔案：<strong>{number(unfinished.length)}</strong></p>
          <p className="muted">注意：此核對僅比較原始檔案紀錄欄位，不能證明交易主檔與明細無漏、無重複；歷史資料補齊應另做逐來源對帳。</p>
          {unfinished.length ? <div style={{ overflowX:"auto" }}><table style={{width:"100%"}}><thead><tr><th>待核對檔案</th><th>種類</th><th>預期</th><th>已登錄</th></tr></thead><tbody>{unfinished.slice(0,30).map((x,i)=><tr key={x.file_name+i}><td>{x.file_name}</td><td>{x.dataset_code}／{x.row_kind}</td><td>{x.expected_rows ?? "未知"}</td><td>{x.imported_rows ?? "未知"}</td></tr>)}</tbody></table></div> : <p>{rawFiles.error ? "無法確認檔案差異" : "已登錄的原始檔案預期列數與匯入列數相符（仍須完成交易資料對帳）。"}</p>}
        </div></section>
        <section className="card" style={{ marginBottom: 18 }}><div className="card-body">
          <h2>最近匯入批次／續傳進度</h2>
          {(batches.data as Batch[] | null)?.length ? <div style={{overflowX:"auto"}}><table style={{width:"100%"}}><thead><tr><th>批次</th><th>來源檔</th><th>狀態</th><th>新增</th><th>拒收</th><th>開始時間</th></tr></thead><tbody>{(batches.data as Batch[]).map(x=><tr key={x.id}><td>#{x.id}</td><td>{x.source_file || "—"}</td><td>{x.status}</td><td>{number(x.imported_rows)}</td><td>{number(x.rejected_rows)}</td><td>{dateTime(x.created_at)}</td></tr>)}</tbody></table></div> : <p className="muted">目前沒有可讀取的批次紀錄。</p>}
          <h3>續傳檢查點</h3>
          {(checkpoints.data as Checkpoint[] | null)?.length ? (checkpoints.data as Checkpoint[]).map((x,i)=><p key={i}>{x.county_code}／{kindLabel(x.dataset_type)}：已處理主檔 {number(x.processed_masters)}、明細 {number(x.processed_details)}；更新 {dateTime(x.updated_at)}</p>) : <p className="muted">目前沒有續傳紀錄。</p>}
        </div></section>
        <section className="card" style={{ marginBottom: 18 }}><div className="card-body">
          <h2>後續補資料作業</h2>
          <ol>
            <li>核對歷史各期官方原始檔清單及 SHA-256，辨識缺少的期別／檔案。</li>
            <li>比對原始檔筆數、來源唯一鍵及資料庫主檔／明細，列出漏筆與異常資料。</li>
            <li>僅對缺漏或失敗區段執行可續傳、具冪等性的 append，不覆寫已驗證資料。</li>
            <li>重新對帳並更新各類資料的已驗證起迄期間，完成後才能標示「已補齊」。</li>
          </ol>
          <p className="muted">本頁只提供檢查資訊，不會觸發匯入或更動資料庫；既有排程繼續獨立運作。既有封存驗證紀錄數：{archives.error ? "無法讀取" : number((archives.data as Archive[] | null)?.length)}（最多顯示最近 10 筆）。</p>
        </div></section>
        <div className="card"><div className="card-body"><h2>功能入口</h2><div className="actions"><Link className="button secondary" href="/real-price">實價登錄查詢</Link><Link className="button secondary" href="/admin/real-price-reports">成交行情報告</Link></div></div></div>
      </div>
    </main>
  );
}
