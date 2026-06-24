import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" href="/">
            阿勇不動產顧問
          </Link>
          <nav className="nav" aria-label="主要導覽">
            <Link href="/properties">主推物件</Link>
            <Link href="/admin/login">後台登入</Link>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
