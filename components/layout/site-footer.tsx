import Link from "next/link";
import type { CompanySettings } from "@/lib/company-settings";
import type { ResolvedNavigationItem } from "@/lib/navigation";

export function SiteFooter({ settings, navigation }: { settings: CompanySettings; navigation: ResolvedNavigationItem[] }) {
  const phoneHref = settings.company_phone ? `tel:${settings.company_phone.replace(/[^\d+]/g, "")}` : null;
  const socialLinks = [
    ["Facebook", settings.facebook_url],
    ["Instagram", settings.instagram_url],
    ["YouTube", settings.youtube_url],
    ["TikTok", settings.tiktok_url]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <>
      <section className="site-app-contact" id="consult">
        <div className="container site-app-contact-card">
          <div>
            <p className="eyebrow">Contact</p>
            <h2>開始諮詢您的不動產需求</h2>
            <p>把您的需求告訴我，我會協助您整理條件、評估預算、分析物件與規劃下一步。</p>
          </div>
          <div className="site-app-contact-actions">
            {settings.line_url ? <a className="button" href={settings.line_url}>Line 阿勇諮詢</a> : null}
            {phoneHref ? <a className="button ghost" href={phoneHref}>撥打電話</a> : null}
            {settings.company_email ? <a className="button ghost" href={`mailto:${settings.company_email}`}>Email 聯絡</a> : null}
            <Link className="button ghost" href="/#service-form">填寫服務表單</Link>
            <Link className="button ghost" href="/contact">完整聯絡資訊</Link>
          </div>
        </div>
        <div className="container site-app-social" aria-label="社群連結">
          {socialLinks.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
        </div>
      </section>
      <footer>
        <div className="site-app-footer">
          <nav className="site-app-footer-nav" aria-label="頁尾導覽">
            {navigation.filter((item) => item.location === "footer").map((item) => (
              <Link href={item.href} key={item.id} target={item.target} rel={item.target === "_blank" ? "noopener noreferrer" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <img className="site-app-brand-logo" src={settings.brand_logo_url} alt={`${settings.brand_name}標誌`} />
          <span>嚴選好物件</span>
          <span>價格透明</span>
          <span>安全交易</span>
          <span>售後服務</span>
          <strong>讓我們協助您安心成家・投資增值</strong>
          <small>{settings.brand_name}・{settings.franchise_name}</small>
          <small>{settings.company_name}</small>
          <small>{settings.brokerage_license_no}・{settings.realtor_certificate_no}</small>
          {settings.company_address ? <small>{settings.company_address}</small> : null}
          <small>{settings.copyright_text}</small>
        </div>
      </footer>
    </>
  );
}
