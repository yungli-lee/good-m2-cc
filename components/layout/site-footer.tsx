import Link from "next/link";

export function SiteFooter() {
  return (
    <>
      <section className="site-app-contact" id="contact-cta">
        <div className="container site-app-contact-card">
          <div>
            <p className="eyebrow">Contact</p>
            <h2>開始諮詢您的不動產需求</h2>
            <p>把您的需求告訴我，我會協助您整理條件、評估預算、分析物件與規劃下一步。</p>
          </div>
          <div className="site-app-contact-actions">
            <a className="button" href="https://line.me/ti/p/abQv5LYzzE">Line 阿勇諮詢</a>
            <a className="button ghost" href="tel:0938137177">撥打阿勇</a>
            <a className="button ghost" href="mailto:best@m2.cc">Email 聯絡</a>
            <Link className="button ghost" href="/#service-form">填寫服務表單</Link>
          </div>
        </div>
        <div className="container site-app-social" aria-label="社群連結">
          <a href="https://m.facebook.com/p0938137177/">Facebook</a>
          <a href="https://youtube.com/channel/UCkHgKlrQTko0FPyAtYC9KBA?si=Dyyb72tdYhEM1IIx">YouTube</a>
          <a href="https://www.tiktok.com/@buyhouse4">TikTok</a>
        </div>
      </section>
      <footer>
        <div className="site-app-footer">
          <span>嚴選好物件</span>
          <span>價格透明</span>
          <span>安全交易</span>
          <span>售後服務</span>
          <strong>讓我們協助您安心成家・投資增值</strong>
          <small>© 阿勇不動產顧問</small>
        </div>
      </footer>
    </>
  );
}
