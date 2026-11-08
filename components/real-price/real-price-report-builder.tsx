"use client";
import { useMemo, useState } from "react";

type CaseRow = {
  id: number; date: string; area: string; kind: string; price: string; ping: string;
  sourceId: string; note: string; rank: "main" | "secondary" | "context";
  reason: string;
};
const STANDARD_VERSION = "V1.0（2026-11-08）";
const empty = (id: number): CaseRow => ({
  id, date: "", area: "", kind: "", price: "", ping: "", sourceId: "",
  note: "", rank: "main", reason: ""
});
const rules = [
  ["資料來源與追溯", "案例以內政部不動產交易實價登錄資料為基礎，標示交易日期、原始編號、來源資料期別與查詢日期；如資料尚未查證，不能列為已核實成交案例。"],
  ["生活圈與區域", "優先挑選同一供需生活圈及相似街廓；不足時擴至有實際替代關係的鄰近生活圈，並逐案說明區位、機能與臨路等差異。行政界線或單一距離不等於同一市場。"],
  ["產品類型", "透天、華廈、公寓、大樓、土地、店住及預售屋分別比較；不同產品不得直接混算建坪單價。比較時應考慮土地持分、公設、車位與計價基礎。"],
  ["時間與個別條件", "原則優先考察近12個月同質成交，資料不足再擴至24個月或36個月並註明；併同檢查屋齡、土地與建物面積、樓層、地坪、面寬、路寬、使用分區及屋況。期間與容許差異是本公司作業建議，非法定固定門檻。"],
  ["特殊交易與排除", "親友／關係人、政府協議價購、持分、增建或未登記建物、分件登記、預售解約、車位價格未拆分等，均須揭露官方原始備註並評估可比性；不適用於一般行情統計者改列特殊參考，不擅自刪改原始資料。"],
  ["用途、限制及公平交付", "本報告僅供交易行情參考，非個別物件正式估價；不能將未查得交易視為無交易。應向買賣雙方公平提供相同選取基礎，保留各自交付與確認紀錄。需搭配不動產說明書及其他依法應踐行程序，不能相互取代。"],
] as const;
export default function RealPriceReportBuilder() {
  const [subject,setSubject] = useState("");
  const [circle,setCircle] = useState("");
  const [kind,setKind] = useState("透天住宅");
  const [windowLabel,setWindowLabel] = useState("近12個月");
  const [criteria,setCriteria] = useState("");
  const [date,setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [reportNo,setReportNo] = useState("");
  const [analyst,setAnalyst] = useState("");
  const [recipient,setRecipient] = useState("買賣雙方（各交付一份）");
  const [rows,setRows] = useState<CaseRow[]>([empty(1),empty(2),empty(3)]);
  const [nextId,setNextId] = useState(4);
  const valid = useMemo(()=>rows.filter(r=>r.sourceId.trim() && r.date && r.price && r.area.trim() && r.reason.trim()),[rows]);
  function update(id:number,key:keyof CaseRow,value:string) {
    setRows(old=>old.map(r=>r.id===id?{...r,[key]:value}:r));
  }
  const pill={padding:"6px 10px",borderRadius:6,border:"1px solid #cbd5e1",fontSize:13};
  const field={padding:"8px 10px",border:"1px solid #cbd5e1",borderRadius:6,width:"100%",boxSizing:"border-box" as const};
  const label=(title:string,control:React.ReactNode)=> <label style={{display:"block",fontSize:13,fontWeight:600}}>{title}<div style={{marginTop:4}}>{control}</div></label>;
  const printable = rows.filter(r=>r.sourceId.trim() && r.date && r.price && r.area.trim() && r.reason.trim());
  return <div className="rp-workspace" style={{maxWidth:1250,margin:"0 auto",padding:"24px 12px"}}>
    <style>{`
      .rp-workspace .rp-editor{background:#fff;border:1px solid #dde4ed;border-radius:12px;padding:20px;margin-bottom:20px}
      .rp-workspace .rp-sheet{background:#fff;color:#172a3a;margin:16px auto;box-shadow:0 4px 20px #0002;width:min(100%,210mm);min-height:297mm;box-sizing:border-box;padding:14mm 15mm;font-family:Arial,"Noto Sans TC","Microsoft JhengHei",sans-serif}
      .rp-workspace .rp-sheet h2{font-size:19px;margin:0 0 8px;color:#123b56}
      .rp-workspace .rp-sheet h3{font-size:13px;margin:12px 0 5px;color:#153c53}
      .rp-workspace .rp-sheet p,.rp-workspace .rp-sheet td,.rp-workspace .rp-sheet th{font-size:11px;line-height:1.65}
      .rp-workspace .rp-sheet table{border-collapse:collapse;width:100%}
      .rp-workspace .rp-sheet td,.rp-workspace .rp-sheet th{border:1px solid #c9d5dc;padding:6px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
      .rp-workspace .rp-sheet th{background:#eef4f7}
      .rp-workspace .rp-sheet .rp-small{font-size:10px;color:#496071}
      .rp-workspace .rp-sheet .rp-row{display:flex;justify-content:space-between;gap:8px}
      .rp-workspace .rp-sheet .rp-rule{border-bottom:1px solid #e1e7ed;padding:7px 0;break-inside:avoid}
      .rp-workspace .rp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
      .rp-workspace input,.rp-workspace select,.rp-workspace textarea{font-family:inherit}
      @page{size:A4 portrait;margin:0}
      @media print{
        body{background:#fff!important}
        body *{visibility:hidden!important}
        .rp-workspace .rp-sheet,.rp-workspace .rp-sheet *{visibility:visible!important}
        .rp-workspace{margin:0!important;padding:0!important;max-width:none!important}
        .rp-workspace .rp-editor,.rp-workspace .rp-ui-title{display:none!important}
        .rp-workspace .rp-sheet{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;padding:13mm 14mm!important;margin:0!important;box-shadow:none!important;page-break-after:always;overflow:hidden}
        .rp-workspace .rp-sheet:last-child{page-break-after:auto}
        .rp-workspace .rp-sheet h2{font-size:17px}
        .rp-workspace .rp-sheet h3{font-size:12px}
        .rp-workspace .rp-sheet p,.rp-workspace .rp-sheet td,.rp-workspace .rp-sheet th{font-size:10px}
      }
    `}</style>
    <div className="rp-ui-title">
      <h1>成交行情告知報告｜雙面A4製作</h1>
      <p style={{color:"#9a3412"}}><strong>內部試行：</strong>必須逐筆核對內政部官方交易資料才能列入報告。本功能尚未接通正式查詢或交付簽收資料庫；列印／另存PDF不代表已送交客戶。</p>
    </div>
    <section className="rp-editor">
      <h2 style={{marginTop:0}}>一、報告基本資料</h2>
      <div className="rp-grid">
        {label("標的／委託案名",<input style={field} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="例如：鹿港某生活圈中古透天"/>)}
        {label("實際比較生活圈",<input style={field} value={circle} onChange={e=>setCircle(e.target.value)} placeholder="例如：鹿港東側○○路周邊"/>)}
        {label("產品類型",<select style={field} value={kind} onChange={e=>setKind(e.target.value)}>{["透天住宅","華廈","公寓","電梯大樓","店住","土地","預售屋"].map(x=><option key={x}>{x}</option>)}</select>)}
        {label("成交期間",<select style={field} value={windowLabel} onChange={e=>setWindowLabel(e.target.value)}>{["近12個月","近24個月","近36個月","其他（請詳述）"].map(x=><option key={x}>{x}</option>)}</select>)}
        {label("查詢／產製日期",<input style={field} type="date" value={date} onChange={e=>setDate(e.target.value)}/>)}
        {label("報告編號",<input style={field} value={reportNo} onChange={e=>setReportNo(e.target.value)} placeholder="自訂，不會自動儲存"/>)}
        {label("經紀人／製作人",<input style={field} value={analyst} onChange={e=>setAnalyst(e.target.value)}/>)}
        {label("交付對象",<select style={field} value={recipient} onChange={e=>setRecipient(e.target.value)}>{["買賣雙方（各交付一份）","買方","賣方"].map(x=><option key={x}>{x}</option>)}</select>)}
      </div>
      <div style={{marginTop:12}}>{label("實際篩選條件、生活圈界線與排除理由",<textarea style={{...field,minHeight:74}} value={criteria} onChange={e=>setCriteria(e.target.value)} placeholder="例如：優先同生活圈、相似臨路及屋齡；因同類案例不足擴大至相鄰住宅圈……"/>)}</div>
    </section>
    <section className="rp-editor">
      <h2 style={{marginTop:0}}>二、人工核實的官方成交案例（最多5筆／雙面A4）</h2>
      <p style={{fontSize:13,color:"#475569"}}>只列入來源編號、日期、區域、價格及比較理由完整的案例。不同產品及特殊交易請選「背景參考」，不得用來混算行情。</p>
      {rows.map((r,i)=><div key={r.id} style={{border:"1px solid #dce3ea",padding:12,borderRadius:9,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><strong>案例 {i+1}</strong><button type="button" style={pill} onClick={()=>setRows(old=>old.filter(x=>x.id!==r.id))}>移除此筆</button></div>
        <div className="rp-grid">
          {label("官方來源編號",<input style={field} value={r.sourceId} onChange={e=>update(r.id,"sourceId",e.target.value)} placeholder="官方交易編號"/>)}
          {label("交易日期",<input type="date" style={field} value={r.date} onChange={e=>update(r.id,"date",e.target.value)}/>)}
          {label("地址／地段（依官方公開資料）",<input style={field} value={r.area} onChange={e=>update(r.id,"area",e.target.value)}/>)}
          {label("產品種類",<input style={field} value={r.kind} onChange={e=>update(r.id,"kind",e.target.value)} placeholder="透天／華廈／土地……"/>)}
          {label("總價（萬元）",<input type="number" min="0" step="any" style={field} value={r.price} onChange={e=>update(r.id,"price",e.target.value)}/>)}
          {label("比較面積（坪，僅作描述）",<input type="number" min="0" step="any" style={field} value={r.ping} onChange={e=>update(r.id,"ping",e.target.value)}/>)}
          {label("比較用途",<select style={field} value={r.rank} onChange={e=>update(r.id,"rank",e.target.value)}><option value="main">主要可比案例</option><option value="secondary">次級可比案例</option><option value="context">特殊／背景參考</option></select>)}
          {label("官方原始備註（保持原意）",<input style={field} value={r.note} onChange={e=>update(r.id,"note",e.target.value)}/>)}
        </div>
        <div style={{marginTop:8}}>{label("納入理由、相對差異／限制作業說明",<textarea style={{...field,minHeight:48}} value={r.reason} onChange={e=>update(r.id,"reason",e.target.value)}/>)}</div>
      </div>)}
      <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <button type="button" style={pill} disabled={rows.length>=5} onClick={()=>{setRows(old=>[...old,empty(nextId)]);setNextId(n=>n+1)}}>新增案例（上限5筆）</button>
        <span style={{fontSize:13}}>符合列印欄位完整性：{valid.length}筆（未驗證官方真偽）</span>
        <button type="button" style={{...pill,background:"#153c53",color:"#fff"}} onClick={()=>window.print()} disabled={valid.length===0||!subject.trim()||!circle.trim()||!criteria.trim()||!reportNo.trim()||!analyst.trim()}>列印雙面A4／另存PDF</button>
      </div>
      <p style={{fontSize:12,color:"#9a3412"}}>此版不自動下載官方紀錄、不判斷有效的官方來源編號，也不儲存交付證明。請列印預覽確認為兩頁A4，印表機選擇「長邊翻轉」。</p>
    </section>
    <article className="rp-sheet" aria-label="報告正面">
      <div className="rp-row"><h2>不動產成交行情參考報告</h2><strong style={{fontSize:12}}>正面｜成交案例</strong></div>
      <div style={{height:4,background:"#b89756",margin:"6px 0 12px"}}/>
      <p><b>報告編號：</b>{reportNo||"（未填）"}　<b>報告日期：</b>{date}　<b>版本：</b>{STANDARD_VERSION}</p>
      <p><b>比較標的：</b>{subject||"（未填）"}　<b>產品：</b>{kind}</p>
      <p><b>實際生活圈：</b>{circle||"（未填）"}　<b>期間：</b>{windowLabel}</p>
      <p><b>選取與排除條件：</b>{criteria||"（未填）"}</p>
      <h3>成交案例及採用理由</h3>
      <table><thead><tr><th style={{width:"13%"}}>日期／類型</th><th style={{width:"26%"}}>位置／官方編號</th><th style={{width:"13%"}}>成交價</th><th style={{width:"48%"}}>用途及差異說明</th></tr></thead>
      <tbody>{printable.length?printable.map((r)=><tr key={r.id}><td>{r.date}<div>{r.kind}</div></td><td>{r.area}<div className="rp-small">編號：{r.sourceId}</div></td><td>{r.price}萬元{r.ping?<div className="rp-small">面積：{r.ping}坪</div>:null}</td><td><b>{r.rank==="main"?"主要可比":r.rank==="secondary"?"次級可比":"特殊／背景"}</b><div>{r.reason}</div>{r.note?<div className="rp-small">官方備註：{r.note}</div>:null}</td></tr>):<tr><td colSpan={4}>尚未輸入完整且經人工核對的成交案例。</td></tr>}</tbody></table>
      <h3>資料解讀及交付說明</h3>
      <p>本頁是「已選取案例」的比較依據，並非全市場交易清單；案例與標的可能因屋況、區位、地坪、臨路、車位及交易情形而有所不同。各案例原始交易備註請以內政部官方紀錄為準，特殊／背景參考不可直接與主要可比案混算。</p>
      <p><b>資料來源：</b>內政部不動產交易實價登錄；<b>製作：</b>{analyst||"（未填）"}；<b>交付對象：</b>{recipient}。</p>
      <p className="rp-small" style={{marginTop:15}}>注意：本試行版由經紀人輸入已核實成交資料，尚未自動查證來源。使用時應保存官方查詢證據與雙方實際交付紀錄；未交付不應標記為已完成告知。</p>
    </article>
    <article className="rp-sheet" aria-label="報告背面">
      <div className="rp-row"><h2>實價登錄成交案例選取標準暨使用說明</h2><strong style={{fontSize:12}}>背面｜固定標準</strong></div>
      <div style={{height:4,background:"#b89756",margin:"6px 0 12px"}}/>
      <p className="rp-small">選案標準版本：{STANDARD_VERSION}　｜　搭配正面報告編號：{reportNo||"（未填）"}　｜　依本公司案例選取作業規範編製，非法定固定範圍或內政部核定估價模型。</p>
      {rules.map(([header,body],i)=><div className="rp-rule" key={header}><h3>{i+1}、{header}</h3><p style={{margin:"2px 0 0"}}>{body}</p></div>)}
      <h3>資料及法律界線</h3>
      <p>相同鄉鎮、相同道路或距離相近，不一定是相同生活圈；透天及大樓結構、土地持分與坪數分母不同，不應直接視為同價物件。本說明係輔助公平提供類似不動產成交資訊，不取代書面委託、不動產說明書、正式不動產估價或依法應辦理的實價登錄申報。</p>
      <h3>報告交付紀錄（由經紀人另行保存）</h3>
      <p>買方：＿＿＿＿＿＿　交付日期／方式：＿＿＿＿＿＿　確認：＿＿＿＿＿＿</p>
      <p>賣方：＿＿＿＿＿＿　交付日期／方式：＿＿＿＿＿＿　確認：＿＿＿＿＿＿</p>
      <p className="rp-small">雙面列印建議：A4直式、雙面長邊翻轉；電子PDF須保留正背兩頁及報告編號。紀錄欄位空白不代表已交付。</p>
    </article>
  </div>;
}
