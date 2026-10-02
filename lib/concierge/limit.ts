// Per-isolate guard for Preview. Production should also use Cloudflare WAF rate rules.
const windows = new Map<string, { count: number; until: number }>();
let active = 0;
export function takeConciergeSlot(ip: string, now = Date.now()) {
  for (const [key, value] of windows) if (value.until < now) windows.delete(key);
  const current = windows.get(ip);
  if (active >= 4 || (current && current.count >= 12) || (!current && windows.size >= 2000)) return null;
  windows.set(ip, { count: (current?.count || 0) + 1, until: current?.until || now + 60000 });
  active++;
  let released = false;
  return () => { if (!released) { active--; released = true; } };
}
