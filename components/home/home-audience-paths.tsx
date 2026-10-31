import Link from "next/link";

export function HomeAudiencePaths({ lineUrl, phone }: { lineUrl?: string | null; phone?: string | null }) {
  const services = [
    { title: "我要買屋／找土地", description: "告訴我們想找的地區、預算與條件，協助您釐清需求與方向。", href: "/contact?service=buy" },
    { title: "我要賣屋／賣土地", description: "先了解物件現況、行情與出售規劃，再一起決定下一步。", href: "/contact?service=sell" },
    { title: "我有不動產問題", description: "產權、貸款、稅務、土地使用或簽約疑問，都可以先聊聊。", href: "/contact?service=consult" },
  ];
  return (
    <section className="audience-paths home-service-first home-service-compact" id="service-start" aria-labelledby="audience-paths-title">
      <div className="section-heading">
        <p className="eyebrow">誠摯服務</p>
        <h2 id="audience-paths-title">今天想找我們聊什麼？</h2>
        <p>不必先研究所有資訊，選擇您的需求，直接聯絡阿勇與阿美。</p>
      </div>
      <div className="audience-path-grid home-service-grid">
        {services.map((service) => (
          <article key={service.title}>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <div className="audience-path-actions">
              {lineUrl ? <a className="button primary" href={lineUrl} target="_blank" rel="noopener noreferrer">LINE 詢問</a> : <Link className="button primary" href={service.href}>聯絡我們</Link>}
              {phone ? <a className="button ghost" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>電話聯絡</a> : <Link className="button ghost" href={service.href}>聯絡方式</Link>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
