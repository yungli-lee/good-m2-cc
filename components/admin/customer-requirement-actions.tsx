"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RequirementStatus } from "@/lib/customer-requirements/types";

export function CustomerRequirementActions({ id, personId, status, canDelete }: { id: string; personId: string; status: RequirementStatus; canDelete: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function call(path: string, body?: unknown, method = "POST") {
    if (busy) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/admin/crm/requirements/${id}${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const output = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) { setError(output?.message || "操作失敗"); return; }
    if (method === "DELETE") router.push(`/admin/people/${personId}#requirements`); else if (path === "/duplicate") router.push(`/admin/crm/requirements/${output.item.id}`); else router.refresh();
  }
  return <div><div className="actions"><button className="button ghost" disabled={busy} onClick={() => call("/duplicate")}>複製</button>{status === "active" ? <button className="button ghost" disabled={busy} onClick={() => call("/status", { status: "paused" })}>暫停</button> : null}{status === "paused" ? <button className="button ghost" disabled={busy} onClick={() => call("/status", { status: "active" })}>恢復</button> : null}{["active", "paused"].includes(status) ? <button className="button ghost" disabled={busy} onClick={() => call("/status", { status: "fulfilled" })}>完成</button> : null}{status !== "archived" ? <button className="button ghost" disabled={busy} onClick={() => call("/status", { status: "archived" })}>封存</button> : null}{canDelete ? <button className="button danger" disabled={busy} onClick={() => call("", undefined, "DELETE")}>刪除未使用客需</button> : null}</div>{error ? <div className="notice" role="alert">{error}</div> : null}</div>;
}
