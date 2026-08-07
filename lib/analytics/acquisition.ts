export type AcquisitionContext = {
  source: string;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referrer: string | null;
  landingPage: string;
  propertyId: string | null;
};

type StoredAcquisition = { first: AcquisitionContext; session: AcquisitionContext; lastNonDirect: AcquisitionContext | null; sessionId: string };
const memory = new Map<string, string>();

function clean(value: string | null, max: number, lowercase = false) {
  const normalized = (value || "").trim().slice(0, max);
  return normalized ? (lowercase ? normalized.toLowerCase() : normalized) : null;
}

function isInternalReferrer(referrer: string | null, origin: string) {
  if (!referrer) return false;
  try { return new URL(referrer).origin === origin; } catch { return false; }
}

export function sourceFromLocation(url: URL, referrer: string | null): AcquisitionContext {
  const utmSource = clean(url.searchParams.get("utm_source"), 120, true);
  const host = (() => { try { return new URL(referrer || "").hostname.toLowerCase(); } catch { return ""; } })();
  let source = utmSource || "direct";
  let medium = clean(url.searchParams.get("utm_medium"), 120, true);
  if (!utmSource && referrer && !isInternalReferrer(referrer, url.origin)) {
    if (/google\./.test(host)) { source = "google"; medium = "organic"; }
    else if (/facebook|fb\./.test(host)) { source = "facebook"; medium = "social"; }
    else if (/instagram/.test(host)) { source = "instagram"; medium = "social"; }
    else if (/line\./.test(host)) { source = "line"; medium = "social"; }
    else { source = "referral"; medium = "referral"; }
  }
  return {
    source,
    medium,
    campaign: clean(url.searchParams.get("utm_campaign"), 160),
    content: clean(url.searchParams.get("utm_content"), 160),
    term: clean(url.searchParams.get("utm_term"), 160),
    referrer: isInternalReferrer(referrer, url.origin) ? null : clean(referrer, 500),
    landingPage: url.pathname.slice(0, 500),
    propertyId: clean(url.searchParams.get("property_id"), 36)
  };
}

export function getAcquisitionContext(sessionId: string): StoredAcquisition | null {
  if (typeof window === "undefined") return null;
  const key = `good_m2_acquisition_${location.hostname.includes("pages.dev") ? "preview" : "production"}`;
  let stored: StoredAcquisition | null = null;
  try { stored = JSON.parse(localStorage.getItem(key) || "null") as StoredAcquisition | null; }
  catch { stored = JSON.parse(memory.get(key) || "null") as StoredAcquisition | null; }
  const current = sourceFromLocation(new URL(location.href), document.referrer || null);
  const next: StoredAcquisition = {
    first: stored?.first || current,
    session: stored?.sessionId === sessionId ? stored.session : current,
    lastNonDirect: current.source !== "direct" ? current : stored?.lastNonDirect || null,
    sessionId
  };
  const encoded = JSON.stringify(next);
  try { localStorage.setItem(key, encoded); } catch { memory.set(key, encoded); }
  return next;
}
