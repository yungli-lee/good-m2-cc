"use client";
import { useState } from "react";
export function CopyPostButton({ body }: { body: string }) {
  const [copied, setCopied] = useState(false);
  return <button className="button ghost" type="button" onClick={async () => {
    try { await navigator.clipboard.writeText(body); setCopied(true); }
    catch { setCopied(false); window.alert("無法複製，請手動選取貼文內容"); }
  }}>{copied ? "已複製" : "複製文案"}</button>;
}
