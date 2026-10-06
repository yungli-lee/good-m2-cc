import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { AreaPageForm } from "@/components/admin/area-page-form";
import { getAdminAreaPage } from "@/lib/areas-cms";
export const runtime = "edge";
export default async function EditAreaPage({ params,searchParams }: { params:Promise<{id:string}>;searchParams:Promise<{error?:string;saved?:string}> }) { await requireRole(["editor","admin","owner"]); const {id}=await params; const p=await searchParams; const {data}=await getAdminAreaPage(id); if(!data)notFound(); return <main className="section"><div className="container"><div className="admin-page-header"><div><p className="eyebrow">Area CMS</p><h1>編輯：{data.name}</h1></div><div className="admin-actions"><Link className="button ghost" href={`/areas/${data.slug}`} target="_blank">查看前台</Link><Link className="button ghost" href="/admin/areas">返回列表</Link></div></div>{p.saved?<div className="success">服務地區已儲存。</div>:null}{p.error?<div className="notice">儲存失敗：請檢查欄位。</div>:null}<AreaPageForm area={data} action={`/admin/areas/${id}/edit/save`}/></div></main>; }
