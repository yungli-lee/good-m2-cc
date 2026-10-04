"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  inquiryId: string;
  initialStatus: string;
  initialNote: string;
  canMarkSpam: boolean;
};

export function InquiryActions({ inquiryId, initialStatus, initialNote, canMarkSpam }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus === "spam" ? "new" : initialStatus);
  const [note, setNote] = useState(initialNote);
  const [busy, setBusy] = useState<"status" | "note" | "spam" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(path: string, init: RequestInit) {
    setError("");
    setMessage("");
    const response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers || {}) }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "操作失敗，請稍後再試。");
    return result;
  }

  async function updateStatus() {
    setBusy("status");
    try {
      await request(`/api/admin/inquiries/${inquiryId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setMessage("處理狀態已更新。");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "狀態更新失敗。");
    } finally {
      setBusy(null);
    }
  }

  async function updateNote() {
    setBusy("note");
    try {
      await request(`/api/admin/inquiries/${inquiryId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ internal_note: note })
      });
      setMessage("備註已儲存。");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "備註儲存失敗。");
    } finally {
      setBusy(null);
    }
  }

  async function markSpam() {
    if (!window.confirm("確定要把這筆詢問標記為 spam？")) return;
    setBusy("spam");
    try {
      await request(`/api/admin/inquiries/${inquiryId}/mark-spam`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setMessage("已標記為 spam。");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "標記 spam 失敗。");
    } finally {
      setBusy(null);
    }
  }

  return <section aria-label="詢問單操作">
    {message ? <div className="notice" role="status">{message}</div> : null}
    {error ? <div className="notice" role="alert">操作失敗：{error}</div> : null}
    <div className="form-grid">
      <div className="field">
        <label htmlFor="status">處理狀態</label>
        <select className="select" id="status" value={status} onChange={event => setStatus(event.target.value)} disabled={busy !== null}>
          <option value="new">new</option>
          <option value="contacted">contacted</option>
          <option value="in_progress">in_progress</option>
          <option value="closed">closed</option>
        </select>
      </div>
      <div className="field" style={{ alignSelf: "end" }}>
        <button className="button" type="button" onClick={() => void updateStatus()} disabled={busy !== null}>
          {busy === "status" ? "更新中…" : "更新狀態"}
        </button>
      </div>
    </div>
    <div className="field" style={{ marginTop: 18 }}>
      <label htmlFor="internal_note">內部備註</label>
      <textarea className="textarea" id="internal_note" value={note} onChange={event => setNote(event.target.value)} disabled={busy !== null} />
      <button className="button" type="button" onClick={() => void updateNote()} disabled={busy !== null}>
        {busy === "note" ? "儲存中…" : "儲存備註"}
      </button>
    </div>
    {canMarkSpam ? <div style={{ marginTop: 18 }}>
      <button className="button danger" type="button" onClick={() => void markSpam()} disabled={busy !== null}>
        {busy === "spam" ? "處理中…" : "標記 spam"}
      </button>
    </div> : null}
  </section>;
}
