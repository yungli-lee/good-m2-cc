"use client";

import { useMemo, useState } from "react";

type Portal = { label: string; query: string };
const PORTALS: Portal[] = [
  { label: "全部來源", query: "(太平洋房屋 OR 591房屋交易 OR 樂屋網 OR 好房網)" },
  { label: "太平洋房屋", query: "太平洋房屋" },
  { label: "591", query: "591房屋交易" },
  { label: "樂屋網", query: "樂屋網" },
  { label: "好房網", query: "好房網" },
];

function googleSearchLink(query: string) {
  return "https://www.google.com/search?" + new URLSearchParams({ q: query, hl: "zh-TW" }).toString();
}

export default function GooglePropertySearchPage() {
  const [county, setCounty] = useState("彰化縣");
  const [town, setTown] = useState("");
  const [kind, setKind] = useState("住宅");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [rooms, setRooms] = useState("");
  const [parking, setParking] = useState(false);
  const [keyword, setKeyword] = useState("");

  const terms = useMemo(() => {
    const result = [county.trim(), town.trim(), "出售", kind, rooms ? rooms + "房" : "", parking ? "車位" : "", keyword.trim()];
    if (minPrice || maxPrice) {
      result.push([minPrice && minPrice + "萬以上", maxPrice && maxPrice + "萬以下"].filter(Boolean).join(" "));
    }
    return result.filter(Boolean).join(" ");
  }, [county, town, kind, minPrice, maxPrice, rooms, parking, keyword]);

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "36px 20px 70px", lineHeight: 1.7 }}>
      <p style={{ color: "#666", marginBottom: 8 }}>good.m2.cc · 跨平台搜尋試驗版</p>
      <h1 style={{ fontSize: "clamp(24px, 5vw, 34px)", fontWeight: 700, marginBottom: 12 }}>Google 售屋搜尋</h1>
      <p style={{ marginBottom: 24 }}>只建立 Google 搜尋連結，不擷取、不儲存其他網站的物件資訊。搜尋結果會在 Google 開啟，再由您前往原始刊登頁。</p>
      <form onSubmit={(event) => { event.preventDefault(); window.open(googleSearchLink(terms + " " + PORTALS[0].query), "_blank", "noopener,noreferrer"); }}
        style={{ display: "grid", gap: 16, padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
        <label>縣市<input value={county} onChange={e => setCounty(e.target.value)} placeholder="彰化縣" style={fieldStyle} /></label>
        <label>鄉鎮市區<input value={town} onChange={e => setTown(e.target.value)} placeholder="鹿港鎮、秀水鄉等" style={fieldStyle} /></label>
        <label>物件類型
          <select value={kind} onChange={e => setKind(e.target.value)} style={fieldStyle}>
            <option>住宅</option><option>透天</option><option>公寓</option><option>電梯大樓</option><option>土地</option><option>店面</option><option>廠房</option>
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          <label>最低總價（萬）<input type="number" min="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={fieldStyle} /></label>
          <label>最高總價（萬）<input type="number" min="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={fieldStyle} /></label>
          <label>房數<input type="number" min="1" max="20" value={rooms} onChange={e => setRooms(e.target.value)} style={fieldStyle} /></label>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={parking} onChange={e => setParking(e.target.checked)} />需要車位</label>
        <label>其他關鍵字<input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="路名、社區名稱、屋齡等" style={fieldStyle} /></label>
        <button type="submit" style={{ border: 0, borderRadius: 8, background: "#a52727", color: "white", padding: 12, cursor: "pointer", fontWeight: 700 }}>開啟 Google 搜尋</button>
      </form>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 28, marginBottom: 12 }}>依網站搜尋</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {PORTALS.map(portal => <a key={portal.label} href={googleSearchLink(terms + " " + portal.query)}
          target="_blank" rel="noopener noreferrer"
          style={{ border: "1px solid #ccc", borderRadius: 8, padding: "10px 14px", textDecoration: "none" }}>
          {portal.label} ↗
        </a>)}
      </div>
      <p style={{ marginTop: 24, fontSize: 14, color: "#555" }}>注意：這是 Google 關鍵字搜尋，不是即時售屋資料庫。價格、房數、車位可能比對不精準，也可能出現已下架、重複或非物件頁。所有刊登資訊應以原始網站為準。本頁不顯示 Google 搜尋結果，也不儲存外站物件內容。</p>
    </main>
  );
}

const fieldStyle: React.CSSProperties = { display: "block", width: "100%", border: "1px solid #bbb", padding: "10px 12px", borderRadius: 8, marginTop: 5, background: "transparent", color: "inherit" };
