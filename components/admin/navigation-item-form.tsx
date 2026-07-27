"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { NavigationItem } from "@/lib/navigation";
import type { SitePage } from "@/lib/home-cms/types";

type Props = {
  item?: NavigationItem | null;
  pages: SitePage[];
};

type ApiResult = {
  ok?: boolean;
  message?: string;
  redirectTo?: string;
};

export function NavigationItemForm({ item, pages }: Props) {
  const router = useRouter();
  const [destination, setDestination] = useState<"page" | "href">(item?.page_id ? "page" : "href");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const response = await fetch(item?.id ? `/api/admin/navigation/${item.id}` : "/api/admin/navigation", {
          method: item?.id ? "PATCH" : "POST",
          body: formData
        });
        const result = await response.json() as ApiResult;
        if (!response.ok || !result.ok) throw new Error(result.message || "導覽項目儲存失敗。");
        router.replace(result.redirectTo || "/admin/navigation?saved=1");
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "導覽項目儲存失敗。");
      }
    });
  }

  function handleDelete() {
    if (!item || !window.confirm(`確定刪除「${item.label}」？`)) return;
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/navigation/${item.id}`, { method: "DELETE" });
        const result = await response.json() as ApiResult;
        if (!response.ok || !result.ok) throw new Error(result.message || "導覽項目刪除失敗。");
        router.replace(result.redirectTo || "/admin/navigation?saved=1");
        router.refresh();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "導覽項目刪除失敗。");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {error ? <div className="notice field full" role="alert">{error}</div> : null}
      <label className="field">
        <span>識別鍵</span>
        <input className="input" name="item_key" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={item?.item_key || ""} required disabled={pending} />
      </label>
      <label className="field">
        <span>顯示位置</span>
        <select className="select" name="location" defaultValue={item?.location || "header"} disabled={pending}>
          <option value="header">Header</option>
          <option value="mobile">Mobile</option>
          <option value="footer">Footer</option>
        </select>
      </label>
      <label className="field full">
        <span>選單名稱</span>
        <input className="input" name="label" defaultValue={item?.label || ""} required disabled={pending} />
      </label>
      <fieldset className="field full">
        <legend>連結來源</legend>
        <label><input type="radio" checked={destination === "page"} onChange={() => setDestination("page")} disabled={pending} /> CMS 頁面</label>
        <label><input type="radio" checked={destination === "href"} onChange={() => setDestination("href")} disabled={pending} /> 固定／外部連結</label>
      </fieldset>
      {destination === "page" ? (
        <label className="field full">
          <span>已發布頁面</span>
          <select className="select" name="page_id" defaultValue={item?.page_id || ""} required disabled={pending}>
            <option value="">請選擇</option>
            {pages.map((page) => <option value={page.id} key={page.id}>{page.title}（/{page.page_key}）</option>)}
          </select>
          <input type="hidden" name="href" value="" />
        </label>
      ) : (
        <label className="field full">
          <span>固定 route 或外部 URL</span>
          <input className="input" name="href" defaultValue={item?.href || ""} placeholder="/properties 或 https://example.com" required disabled={pending} />
          <input type="hidden" name="page_id" value="" />
        </label>
      )}
      <label className="field">
        <span>開啟方式</span>
        <select className="select" name="target" defaultValue={item?.target || "_self"} disabled={pending}>
          <option value="_self">同一分頁</option>
          <option value="_blank">新分頁</option>
        </select>
      </label>
      <label className="field">
        <span>排序</span>
        <input className="input" name="sort_order" type="number" min="0" defaultValue={item?.sort_order ?? 1000} required disabled={pending} />
      </label>
      <label className="field full">
        <input type="checkbox" name="is_visible" defaultChecked={item?.is_visible ?? false} disabled={pending} /> 顯示此選單項目
      </label>
      <div className="admin-actions field full">
        <button className="button" type="submit" disabled={pending}>{pending ? "儲存中..." : "儲存導覽項目"}</button>
        {item ? <button className="button danger" type="button" onClick={handleDelete} disabled={pending}>刪除</button> : null}
      </div>
    </form>
  );
}
