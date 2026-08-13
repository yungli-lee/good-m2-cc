"use client";

import Link from "next/link";
import { useState } from "react";
import type { CompanySettings } from "@/lib/company-settings";
import type { ResolvedNavigationItem } from "@/lib/navigation";

export function HomeHeader({ company, navigation }: { company: CompanySettings; navigation: ResolvedNavigationItem[] }) {
  const [open, setOpen] = useState(false);
  const hasAreaMobileLink = navigation.some((item) => item.location === "mobile" && item.href === "/areas");
  return (
    <header className="site-header" id="top">
      <Link className="brand" href="/" aria-label="回到首頁">
        <img src={company.brand_logo_url} alt={`${company.brand_name}標誌`} />
        <span><strong>{company.brand_name}</strong><small>{company.brand_tagline}</small></span>
      </Link>
      <button className="menu-toggle" data-react-managed type="button" aria-label="開啟選單" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span /><span /><span />
      </button>
      <nav className={`site-nav${open ? " is-open" : ""}`} aria-label="主選單">
        {navigation.filter((item) => item.location === "header" || item.location === "mobile").map((item) => (
          <Link
            className={item.location === "header" ? "cms-nav-desktop-item" : "cms-nav-mobile-item"}
            href={item.href}
            key={`${item.location}-${item.id}`}
            target={item.target}
            rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
            onClick={() => setOpen(false)}
          >{item.label}</Link>
        ))}
        {!hasAreaMobileLink ? <Link className="cms-nav-mobile-item" href="/areas" onClick={() => setOpen(false)}>服務地區</Link> : null}
      </nav>
    </header>
  );
}
