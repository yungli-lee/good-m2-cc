import type { CompanySettings } from "@/lib/company-settings-core";

export function BrokerageDisclosure({ settings, compact = false }: { settings: CompanySettings; compact?: boolean }) {
  return (
    <section className={`brokerage-disclosure${compact ? " brokerage-disclosure-compact" : ""}`} aria-label="經紀業資訊">
      <p className="brokerage-disclosure-company">經紀業：<strong>{settings.company_name}</strong></p>
      <p>{settings.franchise_name}</p>
      {!compact ? <dl>
        <div><dt>經紀業許可文號</dt><dd>{settings.brokerage_license_no}</dd></div>
        <div><dt>不動產經紀人證號</dt><dd>{settings.realtor_certificate_no}</dd></div>
      </dl> : null}
    </section>
  );
}
