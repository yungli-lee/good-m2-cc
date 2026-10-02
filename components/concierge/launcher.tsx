"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function ConciergeLauncher() {
  const path = usePathname();
  if (path === "/guide") return null;
  return <Link href="/guide" className="concierge-launcher" aria-label="阿勇阿美陪你找物件與留下委託需求">阿美陪你找物件</Link>;
}
