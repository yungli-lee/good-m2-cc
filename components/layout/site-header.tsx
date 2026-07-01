"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { hash: string; label: string } | { href: string; label: string };

const navItems: NavItem[] = [
  { hash: "philosophy", label: "服務理念" },
  { hash: "featured-properties", label: "精選物件" },
  { href: "/knowledge", label: "知識庫" },
  { hash: "services", label: "服務項目" },
  { hash: "calculators", label: "房產試算工具" },
  { hash: "process", label: "買屋流程" },
  { hash: "reminders", label: "生活提醒" },
  { hash: "team", label: "聯絡我們" }
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="site-app-header">
      <Link className="site-app-brand" href="/" aria-label="回到首頁">
        <img src="/assets/logo-yongmei.jpeg" alt="阿勇不動產顧問標誌" />
        <span>
          <strong>阿勇不動產顧問</strong>
          <small>彰化房地產資訊與服務</small>
        </span>
      </Link>
      <button
        className="site-app-menu-toggle"
        type="button"
        aria-label="開啟選單"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav className={`site-app-nav${isOpen ? " is-open" : ""}`} aria-label="主選單">
        {navItems.map((item) => (
          <Link
            href={"href" in item ? item.href : (isHome ? `#${item.hash}` : `/?scrollTo=${item.hash}`)}
            key={item.label}
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
