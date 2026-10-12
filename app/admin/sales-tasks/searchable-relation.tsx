"use client";

import { useEffect, useId, useState } from "react";
import { searchSalesTaskOptions } from "./lookup-actions";

type Option = { id: string; label: string };
type Props = {
  kind: "person" | "property";
  label: string;
  options: Option[];
  initialSelection?: Option;
};

export default function SearchableRelation({ kind, label, options, initialSelection }: Props) {
  const id = useId();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState(options.slice(0, 30));
  const [selected, setSelected] = useState(initialSelection);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(options.length > 30);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!activated) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await searchSalesTaskOptions(kind, keyword);
        if (!active) return;
        setResults(result.options);
        setHasMore(Boolean(result.hasMore));
        setError(result.error || "");
      } catch {
        if (active) setError("搜尋失敗，請稍後重試。");
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [kind, keyword, activated]);

  const visible = selected && !results.some(option => option.id === selected.id)
    ? [selected, ...results] : results;
  return <div className="field">
    <label htmlFor={`${id}-search`}>{label}</label>
    <input id={`${id}-search`} className="input" type="search" maxLength={80}
      placeholder={kind === "person" ? "輸入客戶姓名，例如：謝小姐" : "輸入物件關鍵字，例如：鹿港、鎮公所"}
      value={keyword} aria-describedby={`${id}-status`} autoComplete="off"
      onFocus={() => { if (!activated) { setActivated(true); setLoading(true); } }}
      onChange={event => { setKeyword(event.target.value); setLoading(true); setError(""); }}
      onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
    <label className="muted" htmlFor={`${id}-select`}>選擇{kind === "person" ? "客戶" : "物件"}</label>
    <select id={`${id}-select`} className="select" name={kind === "person" ? "person_id" : "property_id"}
      value={selected?.id || ""} disabled={loading} onChange={event => {
        setSelected(visible.find(option => option.id === event.target.value));
      }}>
      <option value="">不指定{kind === "person" ? "客戶" : "物件"}</option>
      {visible.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
    {loading && <input type="hidden" name={kind === "person" ? "person_id" : "property_id"} value={selected?.id || ""} />}
    <small id={`${id}-status`} className="muted" role="status">
      {loading ? "搜尋中…" : error || (results.length === 0 ? "找不到符合的資料，請換個關鍵字。" : hasMore ? "顯示前 30 筆，輸入更完整的關鍵字可縮小範圍。" : `找到 ${results.length} 筆。`)}
    </small>
  </div>;
}
