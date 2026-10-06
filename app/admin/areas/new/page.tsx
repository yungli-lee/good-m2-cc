import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { AreaPageForm } from "@/components/admin/area-page-form";
export const runtime = "edge";
export default async function NewAreaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) { await requireRole(["editor","admin","owner"]); const p=await searchParams; return <main className="section"><div className="container"><div className="admin-page-header"><div><p className="eyebrow">Area CMS</p><h1>新增服務地區</h1></div><Link className="button ghost" href="/admin/areas">返回列表</Link></div>{p.error?<div className="notice">新增失敗：請檢查欄位或 Slug 是否重複。</div>:null}<AreaPageForm action="/admin/areas/new/save"/></div></main>; }
