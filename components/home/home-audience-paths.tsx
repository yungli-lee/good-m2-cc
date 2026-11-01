import Link from "next/link";

export function HomeAudiencePaths({ lineUrl }: { lineUrl?: string | null; phone?: string | null }) {
  const services = [
    { icon: "⌂", title: "買屋・找土地", description: "整理地區、預算與條件", intent: "buy" },
    { icon: "▤", title: "賣屋・賣土地", description: "聊行情與出售規劃", intent: "sell" },
    { icon: "?", title: "不動產諮詢", description: "產權、貸款、稅務與交易", intent: "consult" },
  ] as const;
  return (
    <section className="audience-paths home-service-first home-service-icon-first" id="service-start" aria-labelledby="audience-paths-title">
      <div className="home-service-icon-heading">
        <h2 id="audience-paths-title">今天想聊什麼？</h2>
        <p>選一個方向，AI 陪你整理需求；也能留下聯絡方式，請阿勇阿美接續服務。</p>
      </div>
      <div className="home-service-icon-grid">
        {services.map((service) => (
          <Link key={service.intent} className="home-service-icon-item" href={`/guide?intent=${service.intent}#guide-start`} aria-label={`${service.title}，開啟 AI 對話並可留言`}>
            <span className="home-service-icon-symbol" aria-hidden="true">{service.icon}</span>
            <span className="home-service-icon-copy"><strong>{service.title}</strong><small>{service.description}</small></span>
            <span className="home-service-icon-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
      <p className="home-service-icon-note">AI 對話不會自動留下聯絡資料；需要真人回覆時，可自行確認並送出留言。{lineUrl ? <> 或 <a href={lineUrl} target="_blank" rel="noopener noreferrer">直接 LINE 聯絡</a>。</> : null}</p>
    </section>
  );
}
