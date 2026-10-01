"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { GuideRole, GuideScripts, GuideTopic } from "@/lib/properties/character-guide";

type Props = { scripts: GuideScripts; lineUrl: string; related: Array<{ slug: string; title: string }> };
const roles: Record<GuideRole, string> = { ayong: "阿勇", amei: "阿美" };
const topics: Record<GuideTopic, string> = { overview: "先聽重點", details: "面積與格局", highlights: "推薦特色" };
const hiddenKey = "yongmei-guide-hidden";

export function PropertyCharacterGuide({ scripts, lineUrl, related }: Props) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [role, setRole] = useState<GuideRole>("ayong");
  const [topic, setTopic] = useState<GuideTopic>("overview");
  const [canSpeak, setCanSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechMessage, setSpeechMessage] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const panelId = useId();
  const headingId = useId();
  const text = scripts[role][topic];

  useEffect(() => {
    setCanSpeak("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    try { setHidden(sessionStorage.getItem(hiddenKey) === "1"); } catch { /* Storage can be disabled. */ }
    const stop = () => { if (utteranceRef.current) window.speechSynthesis?.cancel(); };
    const visibility = () => { if (document.hidden) { stop(); setSpeaking(false); } };
    document.addEventListener("visibilitychange", visibility);
    return () => { stop(); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);

  function stopSpeech() {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      window.speechSynthesis?.cancel();
      utteranceRef.current = null;
    }
    setSpeaking(false);
    setSpeechMessage("");
  }
  function close() { stopSpeech(); setOpen(false); triggerRef.current?.focus(); }
  function show(event: React.MouseEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setHidden(false);
    try { sessionStorage.removeItem(hiddenKey); } catch { /* Optional preference. */ }
    setOpen(true);
  }
  function dismiss() {
    stopSpeech(); setOpen(false); setHidden(true);
    try { sessionStorage.setItem(hiddenKey, "1"); } catch { /* Optional preference. */ }
  }
  function speak() {
    if (speaking) { stopSpeech(); return; }
    stopSpeech();
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-TW";
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(item => /^zh[-_]TW$/i.test(item.lang)) || voices.find(item => /^zh/i.test(item.lang));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onend = () => { setSpeaking(false); utteranceRef.current = null; };
      utterance.onerror = () => { setSpeaking(false); utteranceRef.current = null; setSpeechMessage("目前無法播放語音，請先閱讀文字介紹。"); };
      utteranceRef.current = utterance;
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch { setSpeaking(false); setSpeechMessage("目前無法播放語音，請先閱讀文字介紹。"); }
  }

  return <>
    <div className="container character-guide-invitation">
      <span>想快速了解這一件？</span>
      <button type="button" className="button ghost" aria-expanded={open} aria-controls={panelId} onClick={show}>請阿勇、阿美介紹</button>
    </div>
    {!hidden && !open ? <div className="character-guide-launcher">
      <button type="button" className="character-guide-hide" aria-label="隱藏角色小幫手" onClick={dismiss}>×</button>
      <button type="button" className="character-guide-launch" aria-expanded={false} aria-controls={panelId} onClick={show}>
        <img src="/images/guides/ayong-amei.webp" alt="" width={720} height={665} loading="lazy" decoding="async" />
        <span>幫我介紹這一件</span>
      </button>
    </div> : null}
    {open ? <aside id={panelId} className="character-guide-panel" role="region" aria-labelledby={headingId} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <div className="character-guide-header">
        <div><p className="eyebrow">陪你一起找房</p><h2 id={headingId}>阿勇、阿美為你介紹</h2></div>
        <button ref={closeRef} type="button" className="character-guide-close" aria-label="關閉物件介紹" onClick={close}>×</button>
      </div>
      <div className="character-guide-hosts">
        <img src="/images/guides/ayong-amei.webp" alt="穿西裝的 Q 版阿美與阿勇，微笑歡迎你" width={720} height={665} />
        <div className="character-guide-role-buttons">{(Object.keys(roles) as GuideRole[]).map(item => <button type="button" key={item} aria-pressed={role === item} onClick={() => { stopSpeech(); setRole(item); }}>{roles[item]}介紹</button>)}</div>
      </div>
      <div className="character-guide-topics" aria-label="選擇介紹內容">{(Object.keys(topics) as GuideTopic[]).map(item => <button type="button" key={item} aria-pressed={topic === item} onClick={() => { stopSpeech(); setTopic(item); }}>{topics[item]}</button>)}</div>
      <div className="character-guide-bubble" aria-live="polite"><strong>{roles[role]}說：</strong><p>{text}</p></div>
      {canSpeak ? <button type="button" className="button ghost character-guide-speech" onClick={speak}>{speaking ? "停止語音" : "聽語音介紹"}</button> : null}
      {speechMessage ? <p role="status" className="muted">{speechMessage}</p> : null}
      <p className="character-guide-note">依本頁公開資料整理。{canSpeak ? "語音由裝置朗讀。" : ""}</p>
      {related.length ? <div className="character-guide-related"><h3>也可以一起比較</h3>{related.map(item => <Link key={item.slug} href={`/properties/${encodeURIComponent(item.slug)}`} onClick={stopSpeech}>{item.title} <span aria-hidden="true">→</span></Link>)}</div> : null}
      <div className="actions character-guide-actions"><a className="button" href={lineUrl || "/contact"} data-contact-person="阿勇" data-analytics-location="character-guide" onClick={stopSpeech} target="_blank" rel="noreferrer">LINE 詢問這一件</a><Link className="button ghost" href="/properties" onClick={stopSpeech}>看更多物件</Link></div>
    </aside> : null}
  </>;
}
