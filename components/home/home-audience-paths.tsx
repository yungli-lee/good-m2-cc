import Link from "next/link";

export function HomeAudiencePaths() {
  return <section className="audience-paths" aria-labelledby="audience-paths-title"><div className="section-heading"><p className="eyebrow">Start Here</p><h2 id="audience-paths-title">您今天想處理哪一件事？</h2></div><div className="audience-path-grid">
    <article><h3>我要買房</h3><p>從公開物件開始找，也可以先試算預算與每月負擔。</p><div className="audience-path-actions"><Link className="button primary" href="/properties">開始找房</Link><Link className="button ghost" href="/calculator">先做試算</Link></div></article>
    <article><h3>我要賣房</h3><p>先整理物件條件、預估出售費用，再交由阿勇協助規劃。</p><div className="audience-path-actions"><Link className="button primary" href="/contact">提出委售需求</Link><Link className="button ghost" href="/calculators/owner-net-all-in">試算賣方淨拿</Link></div></article>
  </div><div className="audience-area-entry"><div><strong>想先從地區開始找？</strong><span>查看彰化市、秀水鄉與鹿港鎮的房屋土地資訊。</span></div><Link className="button ghost" href="/areas">依地區找房</Link></div></section>;
}
