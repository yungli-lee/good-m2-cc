import Link from "next/link";

export function HomeAudiencePaths({ lineUrl }: { lineUrl?: string | null }) {
  return (
    <section className="audience-paths home-service-first" id="service-start" aria-labelledby="audience-paths-title">
      <div className="section-heading">
        <p className="eyebrow">阿勇與阿美・彰化不動產顧問</p>
        <h2 id="audience-paths-title">買賣不動產，不必自己摸索。</h2>
        <p>我不是帶你看房，我是陪你做決定。告訴我們您的需求，由阿勇與阿美協助釐清條件、評估風險與下一步。</p>
      </div>
      <div className="audience-path-grid home-service-grid">
        <article>
          <h3>我要買屋／找土地</h3>
          <p>不必受限於網站目前刊登的物件。告訴我們希望的地區、預算與條件，我們陪您一起找方向。</p>
          <div className="audience-path-actions"><Link className="button primary" href="/contact">告訴我們購買需求</Link><Link className="button ghost" href="/properties">參考現有物件</Link></div>
        </article>
        <article>
          <h3>我要賣屋／賣土地</h3>
          <p>想知道行情、如何定價與出售時要注意什麼？我們可以先協助整理現況及規劃銷售方式。</p>
          <div className="audience-path-actions"><Link className="button primary" href="/contact">洽詢委託出售</Link><Link className="button ghost" href="/calculators/owner-net-all-in">試算出售費用</Link></div>
        </article>
        <article>
          <h3>我有不動產問題</h3>
          <p>產權、貸款、稅務、土地使用、簽約與交屋，有疑問可以先聊聊，再決定怎麼做。</p>
          <div className="audience-path-actions"><Link className="button primary" href="/contact">提出諮詢問題</Link><Link className="button ghost" href="/knowledge">閱讀專業知識</Link></div>
        </article>
      </div>
      <div className="audience-area-entry">
        <div><strong>不確定該從哪裡開始？</strong><span>直接和阿勇、阿美聊聊需求，網站只是工具，服務才是重點。</span></div>
        {lineUrl ? <a className="button primary" href={lineUrl} target="_blank" rel="noopener noreferrer">LINE 聯絡我們</a> : <Link className="button primary" href="/contact">聯絡我們</Link>}
      </div>
    </section>
  );
}
