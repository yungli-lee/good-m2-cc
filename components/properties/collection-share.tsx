"use client";

import { useState } from "react";

export function CollectionShare({ href, title, origin }: { href: string; title: string; origin?: string }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState("");
  async function copy() {
    const url = new URL(href, window.location.origin).href;
    setCopied(false);
    try { await navigator.clipboard.writeText(url); setCopied(true); setFallback(""); }
    catch { setFallback(url); }
  }
  const url = origin ? new URL(href, origin).href : null;
  return <div className="collection-share">
    <div className="actions">
      <button className="button" type="button" onClick={copy}>複製搜尋結果連結</button>
      {url ? <><a className="button ghost" href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer">分享給 LINE 客人</a></> : null}
    </div>
    <p className="muted" role="status">{copied ? "連結已複製，可以貼到 Facebook、LINE 或傳給客人。" : "一個連結分享整批物件；內容會隨在售物件更新。"}</p>
    {fallback ? <label>請選取並複製連結<input className="input" value={fallback} readOnly onFocus={event => event.currentTarget.select()} /></label> : null}
  </div>;
}
