import { getAnalyticsStorageNamespace, type AnalyticsEnvironment } from "./environment.ts";

export const ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const ANALYTICS_VISITOR_TTL_MS = 365 * 24 * 60 * 60 * 1000;

type StoredVisitor = { id: string; createdAt: number };
type StoredSession = { id: string; lastActiveAt: number };
export type AnalyticsIdentity = { visitorId: string; sessionId: string; storage: "persistent" | "memory" };

const memory = new Map<string, string>();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid() {
  return crypto.randomUUID();
}

function keys(environment?: AnalyticsEnvironment) {
  const namespace = getAnalyticsStorageNamespace(environment);
  return {
    visitor: `good_m2_visitor_${namespace}`,
    session: `good_m2_session_${namespace}`
  };
}

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    const value = memory.get(key);
    return value ? JSON.parse(value) as T : null;
  }
}

function write(key: string, value: unknown) {
  const encoded = JSON.stringify(value);
  try {
    window.localStorage.setItem(key, encoded);
    return "persistent" as const;
  } catch {
    memory.set(key, encoded);
    return "memory" as const;
  }
}

export function getAnalyticsIdentity(now = Date.now(), environment?: AnalyticsEnvironment): AnalyticsIdentity | null {
  if (typeof window === "undefined" || typeof crypto?.randomUUID !== "function") return null;
  const storageKeys = keys(environment);
  const storedVisitor = read<StoredVisitor>(storageKeys.visitor);
  const visitor = storedVisitor && UUID_RE.test(storedVisitor.id) && now - storedVisitor.createdAt < ANALYTICS_VISITOR_TTL_MS
    ? storedVisitor
    : { id: uuid(), createdAt: now };
  const visitorStorage = write(storageKeys.visitor, visitor);

  const storedSession = read<StoredSession>(storageKeys.session);
  const session = storedSession && UUID_RE.test(storedSession.id) && now - storedSession.lastActiveAt < ANALYTICS_SESSION_TIMEOUT_MS
    ? { ...storedSession, lastActiveAt: now }
    : { id: uuid(), lastActiveAt: now };
  const sessionStorage = write(storageKeys.session, session);

  return {
    visitorId: visitor.id,
    sessionId: session.id,
    storage: visitorStorage === "persistent" && sessionStorage === "persistent" ? "persistent" : "memory"
  };
}
