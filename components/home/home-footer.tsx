import Link from "next/link";
import type { CompanySettings } from "@/lib/company-settings";
import type { ResolvedNavigationItem } from "@/lib/navigation";

export function HomeFooter({ company, navigation }: { company: CompanySettings; navigation: ResolvedNavigationItem[] }) {
  return (
    <>
      <footer>
        <nav className="cms-footer-navigation" aria-label="頁尾導覽">
          {navigation.filter((item) => item.location === "footer").map((item) => (
            <Link href={item.href} key={item.id} target={item.target} rel={item.target === "_blank" ? "noopener noreferrer" : undefined}>{item.label}</Link>
          ))}
        </nav>
        <div className="site-footer">
          <span>嚴選好物件</span><span>價格透明</span><span>安全交易</span><span>售後服務</span>
          <strong>讓我們協助您安心成家・投資增值</strong>
        </div>
      </footer>
      {company.line_url ? <a className="floating-line" href={company.line_url}>Line 諮詢</a> : null}
    </>
  );
}
