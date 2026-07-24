"use client";

import { useState } from "react";
import type { NavigationItem } from "@/lib/navigation";
import type { SitePage } from "@/lib/home-cms/types";

type Props = {
  action: (formData: FormData) => void;
  item?: NavigationItem | null;
  pages: SitePage[];
};

export function NavigationItemForm({ action, item, pages }: Props) {
  const [destination, setDestination] = useState<"page" | "href">(item?.page_id ? "page" : "href");
  return (
    <form action={action} className="form-grid">
      <label className="field">
        <span>識別鍵</span>
        <input className="input" name="item_key" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={item?.item_key || ""} required />
      </label>
      <label className="field">
        <span>顯示位置</span>
        <select className="select" name="location" defaultValue={item?.location || "header"}>
          <option value="header">Header</option>
          <option value="mobile">Mobile</option>
          <option value="footer">Footer</option>
        </select>
      </label>
      <label className="field full">
        <span>選單名稱</span>
        <input className="input" name="label" defaultValue={item?.label || ""} required />
      </label>
      <fieldset className="field full">
        <legend>連結來源</legend>
        <label><input type="radio" checked={destination === "page"} onChange={() => setDestination("page")} /> CMS 頁面</label>
        <label><input type="radio" checked={destination === "href"} onChange={() => setDestination("href")} /> 固定／外部連結</label>
      </fieldset>
      {destination === "page" ? (
        <label className="field full">
          <span>已發布頁面</span>
          <select className="select" name="page_id" defaultValue={item?.page_id || ""} required>
            <option value="">請選擇</option>
            {pages.map((page) => <option value={page.id} key={page.id}>{page.title}（/{page.page_key}）</option>)}
          </select>
          <input type="hidden" name="href" value="" />
        </label>
      ) : (
        <label className="field full">
          <span>固定 route 或外部 URL</span>
          <input className="input" name="href" defaultValue={item?.href || ""} placeholder="/properties 或 https://example.com" required />
          <input type="hidden" name="page_id" value="" />
        </label>
      )}
      <label className="field">
        <span>開啟方式</span>
        <select className="select" name="target" defaultValue={item?.target || "_self"}>
          <option value="_self">同一分頁</option>
          <option value="_blank">新分頁</option>
        </select>
      </label>
      <label className="field">
        <span>排序</span>
        <input className="input" name="sort_order" type="number" min="0" defaultValue={item?.sort_order ?? 1000} required />
      </label>
      <label className="field full">
        <input type="checkbox" name="is_visible" defaultChecked={item?.is_visible ?? false} /> 顯示此選單項目
      </label>
      <div className="admin-actions field full">
        <button className="button" type="submit">儲存導覽項目</button>
      </div>
    </form>
  );
}
