"use client";

import Link from "next/link";
import { useState } from "react";
import type { CompanySettings } from "@/lib/company-settings";
import type { ResolvedNavigationItem } from "@/lib/navigation";

export function SiteHeader({ settings, navigation }: { settings: CompanySettings; navigation: ResolvedNavigationItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const headerItems = navigation.filter((item) => item.location === "header");
  const mobileItems = navigation.filter((item) => item.location === "mobile");

  return (
    <header className="site-app-header">
      <Link className="site-app-brand" href="/" aria-label="回到首頁">
        <img src={settings.brand_logo_url} alt={`${settings.brand_name}標誌`} />
        <span>
          <strong>{settings.brand_name}</strong>
          <small>{settings.brand_tagline}</small>
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
        {headerItems.map((item) => (
          <Link
            className="site-app-nav-desktop-item"
            href={item.href}
            key={item.id}
            target={item.target}
            rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        {mobileItems.map((item) => (
          <Link
            className="site-app-nav-mobile-item"
            href={item.href}
            key={item.id}
            target={item.target}
            rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
