"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { relationshipLabels, relationshipTypes, type RelationInput } from "@/lib/people-properties";

type Props = { mode: "create" | "update"; personId: string; propertyId: string; relationId?: string; propertyOptions?: Array<{ id: string; title: string }>; peopleOptions?: Array<{ id: string; display_name: string; phone?: string | null; email?: string | null }>; initial?: Partial<RelationInput>; };
export function PeoplePropertyRelationForm({ mode, personId, propertyId, relationId, propertyOptions = [], peopleOptions = [], initial = {} }: Props) {
  const router = useRouter();
  const [relationshipType, setRelationshipType] = useState<(typeof relationshipTypes)[number]>((initial.relationship_type as (typeof relationshipTypes)[number]) || "contact");
  const [relationshipLabel, setRelationshipLabel] = useState(initial.relationship_label || "");
  const [note, setNote] = useState(initial.note || "");
  const [startedAt, setStartedAt] = useState(initial.started_at?.slice(0, 10) || "");
  const [endedAt, setEndedAt] = useState(initial.ended_at?.slice(0, 10) || "");
  const [selectedProperty, setSelectedProperty] = useState(propertyId);
  const [selectedPerson, setSelectedPerson] = useState(personId);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const payload = { person_id: selectedPerson, property_id: selectedProperty, relationship_type: relationshipType, relationship_label: relationshipType === "other" ? relationshipLabel : "", note, started_at: startedAt, ended_at: endedAt };
    const response = await fetch(mode === "create" ? "/api/admin/people-properties" : `/api/admin/people-properties/${relationId}`, { method: mode === "create" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !body?.ok) { setError(body?.message || "關聯操作失敗，請稍後再試。"); return; }
    setMessage(body.message || "已儲存"); router.refresh();
  }
  return <form className="form-grid" onSubmit={submit}>
    {mode === "create" && propertyOptions.length ? <label className="field"><span>物件</span><select className="select" value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} required><option value="">請選擇</option>{propertyOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label> : null}
    {mode === "create" && peopleOptions.length ? <label className="field"><span>People</span><select className="select" value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)} required><option value="">請選擇</option>{peopleOptions.map((p) => <option key={p.id} value={p.id}>{p.display_name} {p.phone || p.email ? `（${p.phone || p.email}）` : ""}</option>)}</select></label> : null}
    <label className="field"><span>關係</span><select className="select" value={relationshipType} onChange={(e) => { const next = e.target.value as (typeof relationshipTypes)[number]; setRelationshipType(next); if (next !== "other") setRelationshipLabel(""); }}>{relationshipTypes.map((t) => <option key={t} value={t}>{relationshipLabels[t]}</option>)}</select></label>
    {relationshipType === "other" ? <label className="field"><span>其他關係名稱</span><input className="input" value={relationshipLabel} onChange={(e) => setRelationshipLabel(e.target.value)} required /></label> : null}
    <label className="field"><span>開始日期</span><input className="input" type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} /></label>
    <label className="field"><span>結束日期</span><input className="input" type="date" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} /></label>
    <label className="field full"><span>備註</span><textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} /></label>
    {error ? <div className="notice" role="alert">{error}</div> : null}{message ? <div className="notice" role="status">{message}</div> : null}
    <button className="button" type="submit" disabled={busy}>{busy ? "儲存中…" : mode === "create" ? "建立關聯" : "儲存關係"}</button>
  </form>;
}

export function ArchiveRelationButton({ relationId, onMessage }: { relationId: string; onMessage?: (message: string) => void }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function archive() { if (!window.confirm("確定要封存這筆關聯嗎？")) return; setBusy(true); const response = await fetch(`/api/admin/people-properties/${relationId}/archive`, { method: "POST" }); const body = await response.json().catch(() => null); setBusy(false); if (!response.ok || !body?.ok) { setError(body?.message || "封存失敗，請稍後再試。"); return; } onMessage?.(body.message); router.refresh(); }
  return <span>{error ? <span className="notice" role="alert">{error}</span> : null}<button className="button danger" type="button" onClick={archive} disabled={busy}>{busy ? "處理中…" : "封存"}</button></span>;
}
