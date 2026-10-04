"use client";

import { useState } from "react";

export function CollectionShare({ href, title, origin }: { href: string; title: string; origin?: string }) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState("");

  function resolvedUrl() {
    return new URL(href, origin || window.location.origin).href;
  }

  async function writeClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFallback("");
      return true;
    } catch {
      setFallback(url);
      return false;
    }
  }

  async function copy() {
    setCopied(false);
    setMessage("");
    const ok = await writeClipboard(resolvedUrl());
    if (ok) setMessage("連結已複製，可以貼到 Facebook、LINE 或傳給客人。");
  }

  async function shareFacebook() {
    const url = resolvedUrl();
    setMessage("");
    setFallback("");

    // Avoid Facebook's legacy sharer endpoint: it can get stuck on share_channel.
    // On supported phones use the native share sheet, where Facebook can be selected.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        setMessage("已開啟系統分享；選擇 Facebook 即可發布。");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    // Desktop fallback: copy first, then open Facebook. This is more reliable than
    // facebook.com/sharer/sharer.php, which may spin indefinitely for some sessions.
    const ok = await writeClipboard(url);
    window.open("https://www.facebook.com/", "_blank", "noopener,noreferrer");
    setMessage(ok
      ? "Facebook 已開啟，連結也已複製；建立貼文後直接貼上即可。"
      : "Facebook 已開啟；請複製下方連結後貼到貼文。");
  }

  const url = origin ? new URL(href, origin).href : null;
  return <div className="collection-share">
    <div className="actions">
      <button className="button" type="button" onClick={copy}>複製搜尋結果連結</button>
      {url ? <>
        <button className="button ghost" type="button" onClick={() => void shareFacebook()}>分享到 Facebook</button>
        <a className="button ghost" href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer">分享給 LINE 客人</a>
      </> : null}
    </div>
    <p className="muted" role="status">{message || (copied ? "連結已複製，可以貼到 Facebook、LINE 或傳給客人。" : "一個連結分享整批物件；內容會隨在售物件更新。")}</p>
    {fallback ? <label>請選取並複製連結<input className="input" value={fallback} readOnly onFocus={event => event.currentTarget.select()} /></label> : null}
  </div>;
}
