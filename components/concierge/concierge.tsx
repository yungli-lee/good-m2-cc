"use client";
import Link from "next/link";
import { chatContact, redactChatContact } from "@/lib/concierge/contact";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { needsSchema, needsSummary, type Needs } from "@/lib/concierge/schema";
import { getClientAnalyticsIdentity, trackEvent } from "@/lib/analytics/client";

type Card = { id: string; slug: string; title: string; price: number | null; district: string | null; layout: string | null };
type Reply = { viewingTime?: string; focusedProperty?: Card | null; action?: string; answer: string; mode: string; needs: Needs; summary: string; properties: Card[]; knowledge: { title: string; slug: string; summary: string }[]; searchHref: string | null; needsReview: boolean; audioToken: string | null };
type Message = { role: "user" | "assistant"; text: string; reply?: Reply; character?: "amei" | "ayong" };
type Turnstile = { render(element: HTMLElement, options: Record<string, unknown>): string; remove(id: string): void; reset(id: string): void };
function turnstile() { return (window as unknown as { turnstile?: Turnstile }).turnstile; }
export function Concierge({ aiEnabled, siteKey, phone, lineUrl }: { aiEnabled: boolean; siteKey: string; phone: string; lineUrl: string }) {
  const [role, setRole] = useState<"amei" | "ayong">("amei");
  const [needs, setNeeds] = useState<Needs>(() => needsSchema.parse({}));
  const [messages, setMessages] = useState<Message[]>([]);
  const [focusedProperty, setFocusedProperty] = useState<Card | null>(null);
  const candidates = useRef<Card[]>([]);
  const [viewingTime, setViewingTime] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showLead, setShowLead] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [leadVersion, setLeadVersion] = useState(0);
  const leadSection = useRef<HTMLElement>(null);
  const [summary, setSummary] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [token, setToken] = useState("");
  const [widgetReady, setWidgetReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const generation = useRef(0);
  const clicked = useRef<Card[]>([]);
  function stop() {
    generation.current++;
    if (audio.current) { audio.current.pause(); audio.current.onended = null; audio.current.onerror = null; audio.current.removeAttribute("src"); audio.current.load(); audio.current = null; }
    if (audioUrl.current) { URL.revokeObjectURL(audioUrl.current); audioUrl.current = null; }
    setSpeaking(false);
  }
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);
  useEffect(() => {
    const playbackGeneration = generation;
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); playbackGeneration.current++; audio.current?.pause(); if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); };
  }, []);
  useEffect(() => {
    if (!showLead || !siteKey || !widgetReady || !widget.current || !turnstile()) return;
    widgetId.current = turnstile()!.render(widget.current, { sitekey: siteKey, callback: (value: string) => setToken(value), "expired-callback": () => setToken(""), "error-callback": () => setToken("") });
    return () => { if (widgetId.current) turnstile()?.remove(widgetId.current); widgetId.current = null; setToken(""); };
  }, [showLead, siteKey, widgetReady]);
  async function ask(text: string, selected: Card | null = focusedProperty) {
    if (busy || sending || !text.trim()) return;
    stop(); setError(""); setBusy(true); setInput("");
    const contact = chatContact(text);
    const updatedMessages: Message[] = [...messages, { role: "user", text }];
    const history = messages.slice(-10).map(m => ({ role: m.role, text: redactChatContact(m.text) }));
    setMessages(m => [...m, { role: "user", text }]);
    try {
      const response = await fetch("/api/public/concierge", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, message: redactChatContact(text), history, needs, focusedSlug: selected?.slug || "", viewingTime, candidateSlugs: candidates.current.map(p => p.slug) }), signal: AbortSignal.timeout(55000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "暫時無法回答，請稍後重試");
      if (contact.phone) {
        setContactPhone(contact.phone); if (contact.name) setContactName(contact.name);
        openLead(data.needs, updatedMessages, data.viewingTime || "");
      }
      setFocusedProperty(data.focusedProperty || null); setViewingTime(data.viewingTime || "");
      if (data.action === "search") candidates.current = data.properties;
      setNeeds(data.needs); setMessages(m => [...m, { role: "assistant", text: data.answer, reply: data, character: role }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "暫時無法回答");
      if (contact.phone) { setContactPhone(contact.phone); if (contact.name) setContactName(contact.name); openLead(needs, updatedMessages); }
    }
    finally { setBusy(false); }
  }
  async function play(reply: Reply) {
    stop(); if (!reply.audioToken) return;
    const current = generation.current; setSpeaking(true);
    try {
      const response = await fetch("/api/public/concierge/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: reply.audioToken }), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      if (current !== generation.current) return;
      audioUrl.current = URL.createObjectURL(blob);
      audio.current = new Audio(audioUrl.current);
      audio.current.onended = stop;
      audio.current.onerror = () => { stop(); setError("語音暫時無法播放，請閱讀文字回答"); };
      await audio.current.play();
    } catch { if (current === generation.current) { stop(); setError("語音暫時無法播放，請閱讀文字回答；較早的回答請重新詢問"); } }
  }
  function openLead(currentNeeds = needs, currentMessages = messages, currentViewingTime = viewingTime) {
    stop(); setLeadError(""); setSent(false);
    const turns = currentMessages.filter(m => m.role === "user").slice(-4).map(m => m.text).join("\n");
    setSummary(`${needsSummary(currentNeeds)}${focusedProperty ? `\n詢問物件：${focusedProperty.title} /properties/${focusedProperty.slug}` : ""}${currentViewingTime ? `\n希望看屋時間：${currentViewingTime}（待真人確認）` : ""}\n客人補充：\n${turns || "請補充需求"}${clicked.current.length ? `\n點閱物件：${clicked.current.map(p => `${p.title} /properties/${p.slug}`).join("；")}` : ""}`.slice(0, 900));
    setLeadVersion(v => v + 1); setShowLead(true);
  }
  useEffect(() => { if (showLead) leadSection.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [showLead, leadVersion]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending || sent) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (fields.get("consent") !== "on") { setLeadError("請勾選同意聯絡與服務需求使用資料"); return; }
    setSending(true); setLeadError("");
    const identity = getClientAnalyticsIdentity();
    try {
      const response = await fetch("/api/public/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        form_type: `concierge-${needs.intent}`, property_id: focusedProperty?.id || "", name: fields.get("name"), phone: fields.get("phone"), email: "", consent: true,
        message: `${summary}\n方便聯絡：${String(fields.get("contact_time") || "未指定").slice(0, 60)}\n希望由${role === "amei" ? "阿美" : "阿勇"}接洽`.slice(0, 1000),
        source_page: "/guide", website: fields.get("website") || "", turnstile_token: token,
        visitor_id: identity?.visitorId || "", session_id: identity?.sessionId || ""
      }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(Object.values(result.field_errors || {}).join("；") || result.error || "送出失敗，請重試");
      setSent(true);
      void trackEvent("submit_inquiry", { properties: { form_type: `concierge-${needs.intent}`, form_location: "guide" } });
      setLeadError(result.email_sent ? `需求已送出，並已寄出通知；阿勇${phone ? `（${phone}）` : ""}、阿美會再與你聯繫。` : "需求已成功存入後台；通知暫時未寄出，你也可以使用網站 LINE 諮詢。");
    } catch (e) {
      setLeadError(e instanceof Error ? e.message : "送出失敗，請重試");
      if (widgetId.current) turnstile()?.reset(widgetId.current); setToken("");
    } finally { setSending(false); }
  }
  const lastReplyIndex = messages.reduce((last, message, index) => message.reply ? index : last, -1);
  return <div className="concierge">
    {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setWidgetReady(true)} />}
    <div className="concierge-heading"><div className={`character-guide-person character-guide-person-${role}`} aria-hidden="true"><img src="/images/guides/ayong-amei.webp" alt="" width="184" height="170" /></div>
      <div><p className="eyebrow">陪你一起找房</p><h1>你想找什麼物件？</h1><p>{aiEnabled ? "告訴我地區、預算與需求，阿美、阿勇陪你找。" : "目前為需求導覽模式，可整理條件、搜尋物件與留下需求。"}</p>
        <div className="concierge-role-switch" aria-label="選擇導覽角色">{(["amei", "ayong"] as const).map(value => <button key={value} type="button" aria-pressed={role === value} className={role === value ? "selected" : ""} onClick={() => { stop(); setRole(value); }}>{value === "amei" ? "阿美" : "阿勇"}帶你找</button>)}</div></div></div>
    <div className="concierge-shortcuts">{!messages.length && ["我想找鹿港住宅", "我有物件想委託出售", "我想找租屋"].map(text => <button className="concierge-quiet" type="button" key={text} disabled={busy} onClick={() => void ask(text)}>{text}</button>)}{messages.length > 0 && <button className="concierge-quiet" disabled={busy || sending} onClick={() => { stop(); setMessages([]); setViewingTime(""); setFocusedProperty(null); candidates.current = []; setNeeds(needsSchema.parse({})); clicked.current = []; setShowLead(false); setContactName(""); setContactPhone(""); setSummary(""); setSent(false); setError(""); }}>重新開始</button>}</div>
    {focusedProperty && <div className="concierge-focus"><span>正在聊：<strong>{focusedProperty.title}</strong></span><button className="concierge-quiet" type="button" disabled={busy || sending} onClick={() => { setFocusedProperty(null); void ask("重新找物件", null); }}>重新找物件</button></div>}
    <div className={`concierge-conversation ${!messages.length && !busy ? "is-empty" : ""}`} role="log" aria-label="需求導覽對話" aria-live="polite">
      {!messages.length && <p>想找房、找土地，還是有物件想委託？告訴我地區、預算與必要條件，我陪你一起找。</p>}
      {messages.map((m, index) => <article className={`concierge-message ${m.role}`} key={index}>
        <strong>{m.role === "user" ? "你" : `${m.character === "ayong" ? "阿勇" : "阿美"} Q版助理${m.reply?.mode === "ai" ? " · AI 回答" : " · 需求導覽"}`}</strong><p>{m.text}</p>
        {m.reply && <>{index === lastReplyIndex && <div className="concierge-actions"><button className="button primary" type="button" disabled={busy || sending} onClick={() => openLead()}>{`請${role === "amei" ? "阿美" : "阿勇"}聯絡我`}</button><span>整理需求，確認後再送出</span></div>}<small>需求摘要：{m.reply.summary}</small>{m.reply.needsReview && <p>以下物件的必要條件仍待真人確認。</p>}
          <div className="concierge-cards">{(index === lastReplyIndex ? m.reply.properties.filter(p => !focusedProperty || p.slug === focusedProperty.slug) : []).map(p => <div className="concierge-property" key={p.id}><Link key={p.id} href={`/properties/${p.slug}`} onClick={() => { stop(); setFocusedProperty(p); if (!clicked.current.some(c => c.id === p.id)) clicked.current.push(p); }} target="_blank" rel="noopener"><strong>{p.title}</strong><span>{p.price === null ? "價格請洽詢" : `${p.price.toLocaleString()} 萬元`} · {p.district}</span>{p.layout && <span>{p.layout}</span>}<span>查看物件 ↗</span></Link><button className="concierge-quiet" type="button" disabled={busy || sending} onClick={() => { setFocusedProperty(p); void ask(`我想了解「${p.title}」這間物件`, p); }}>詢問這間</button></div>)}</div>
          {!focusedProperty && index === lastReplyIndex && m.reply.searchHref && <Link className="button" href={m.reply.searchHref} target="_blank" rel="noopener" onClick={stop}>查看這組條件的搜尋結果 ↗</Link>}
          {m.reply.knowledge.length > 0 && <div><p>相關知識</p>{m.reply.knowledge.map(k => <p key={k.slug}><Link href={`/knowledge/${k.slug}`} target="_blank" rel="noopener">{k.title} ↗</Link></p>)}</div>}
          {m.reply.audioToken && <button className="button" type="button" onClick={() => speaking ? stop() : void play(m.reply!)}>{speaking ? "停止語音" : "聽這段回答"}</button>}</>}
      </article>)}{busy && <p role="status">正在整理需求與查詢公開資料…</p>}<div ref={bottom} />
    </div>
    {error && <p role="alert">{error}</p>}
    <form className="concierge-compose" onSubmit={e => { e.preventDefault(); void ask(input); }}><label htmlFor="concierge-input">告訴我你的需求</label><textarea id="concierge-input" value={input} onChange={e => setInput(e.target.value)} maxLength={500} rows={2} placeholder="例如：鹿港或福興，800萬以下的住宅，需要孝親房" required disabled={busy} /><button className="button primary" disabled={busy}>{busy ? "整理中…" : "送出提問"}</button></form>
    <div className="concierge-direct-contact"><p>不想留下資料？可以直接打電話或加 LINE。</p><div className="concierge-actions">{phone && <a className="button" href={`tel:${phone.replace(/[^\d+]/g, "")}`} data-contact-person="阿勇" data-cta-location="concierge_direct">阿勇 {phone} · 撥打電話</a>}{lineUrl && <a className="button" href={lineUrl} target="_blank" rel="noopener noreferrer" data-contact-person="阿勇" data-cta-location="concierge_direct">加 LINE 諮詢 ↗</a>}</div></div>
    <div className="concierge-handoff"><span>想請我們回電？</span><button className="button primary" type="button" disabled={busy || sending} onClick={() => openLead()}>{`請${role === "amei" ? "阿美" : "阿勇"}聯絡我`}</button></div>
    <details className="concierge-privacy"><summary>隱私與聯絡說明</summary><p className="concierge-privacy">先描述需求，不用提供完整門牌。若在聊天留下手機，會帶入聯絡表單，由你確認後才送出。{aiEnabled ? "文字問題會交由 AI 服務處理；聯絡資料在確認送出表單後才存入後台。" : "聯絡資料在確認送出表單後才存入後台。"}</p></details>
    {showLead && <section ref={leadSection} className="concierge-lead" aria-labelledby="concierge-lead-title"><h2 id="concierge-lead-title">確認需求與聯絡方式</h2><p>請確認這是你本人的聯絡資料。尚未送出；確認並同意後，才會通知阿勇、阿美。</p><form key={leadVersion} onSubmit={submit} data-form-type={`concierge-${needs.intent}`} data-form-location="guide">
      <label>需求摘要（可以修改）<textarea rows={6} value={summary} onChange={e => setSummary(e.target.value)} minLength={10} maxLength={900} required disabled={sent || sending} /></label>
      <div className="form-grid"><label>稱呼<input name="name" value={contactName} onChange={e => setContactName(e.target.value)} autoComplete="name" minLength={1} maxLength={20} required disabled={sent || sending} /></label><label>手機<input name="phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} type="tel" autoComplete="tel" pattern="09[0-9]{8}" placeholder="09xxxxxxxx" required disabled={sent || sending} /></label><label>方便聯絡時間<input name="contact_time" maxLength={60} placeholder="例如：平日晚上" disabled={sent || sending} /></label></div>
      <label className="concierge-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="consent-check"><input name="consent" type="checkbox" required disabled={sent || sending} /><span>我同意勇美為聯絡與服務需求使用以上資料，交由阿勇、阿美接洽。</span></label>
      {siteKey && <div ref={widget} />}{leadError && <p role={sent ? "status" : "alert"}>{leadError}</p>}
      <div className="concierge-actions"><button className="button primary" disabled={sending || sent || Boolean(siteKey && !token)}>{sent ? "已送出" : sending ? "送出中…" : `請${role === "amei" ? "阿美" : "阿勇"}聯絡我`}</button><button className="button" type="button" onClick={() => setShowLead(false)}>收起表單</button></div>
    </form></section>}
  </div>;
}
