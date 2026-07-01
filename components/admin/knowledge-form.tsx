"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminRole } from "@/lib/auth";
import { itemTagText, legalStatusValues } from "@/lib/content/schema";
import type { KnowledgeActionResult } from "@/app/admin/knowledge/actions";
import type { ContentCategory, ContentItem } from "@/lib/content/types";
import { legalStatusLabels } from "@/lib/content/types";

type Props = {
  action: (formData: FormData) => Promise<KnowledgeActionResult>;
  categories: ContentCategory[];
  item?: ContentItem | null;
  role: AdminRole;
  disabled?: boolean;
};

function dateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function KnowledgeForm({ action, categories, item, role, disabled = false }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedLegalStatus = item?.legal_status || "";
  const legalOptions = legalStatusValues.filter((status) => role !== "editor" || status !== "current");
  const slugPreview = item?.slug ? `/knowledge/${item.slug}` : "儲存後由系統產生";

  useEffect(() => {
    const savedToast = sessionStorage.getItem("knowledge-toast");
    if (savedToast) {
      sessionStorage.removeItem("knowledge-toast");
      setToast(savedToast);
      return;
    }
    if (searchParams.get("saved")) setToast("儲存成功");
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (!result.ok) {
          setError(result.message || "儲存失敗，請稍後再試。");
          return;
        }

        const message = result.message || "儲存成功";
        if (result.redirectTo) {
          sessionStorage.setItem("knowledge-toast", message);
          router.replace(result.redirectTo);
          return;
        }

        setToast(message);
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "儲存失敗，請稍後再試。");
      }
    });
  }

  return (
    <form ref={formRef} className="form-grid" onSubmit={handleSubmit}>
      {toast ? <div className="success field full" role="status">{toast}</div> : null}
      {error ? <div className="notice field full" role="alert">{error}</div> : null}
      <div className="field">
        <span>標題</span>
        <input className="input" name="title" defaultValue={item?.title || ""} required disabled={disabled || pending} />
      </div>

      <div className="field">
        <span>Slug</span>
        <input className="input" name="slug" defaultValue={item?.slug || ""} placeholder="可留空，系統自動產生" disabled={disabled || pending} />
      </div>

      <div className="field">
        <span>分類</span>
        <select className="select" name="category_id" defaultValue={item?.category_id || ""} disabled={disabled || pending}>
          <option value="">未分類</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <span>排序</span>
        <input className="input" type="number" name="sort_order" defaultValue={item?.sort_order ?? 1000} disabled={disabled || pending} />
      </div>

      <div className="field full">
        <span>標籤</span>
        <input className="input" name="tags" defaultValue={itemTagText(item)} placeholder="用逗號或換行分隔" disabled={disabled || pending} />
      </div>

      <div className="field full">
        <span>摘要</span>
        <textarea className="textarea" name="summary" rows={3} defaultValue={item?.summary || ""} disabled={disabled || pending} />
      </div>

      <div className="field full">
        <span>內文</span>
        <textarea className="textarea" name="body" rows={14} defaultValue={item?.body || ""} disabled={disabled || pending} />
      </div>

      <details className="field full" open>
        <summary>進階 SEO 設定</summary>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field full">
            <span>SEO 網頁標題</span>
            <input className="input" name="seo_title" defaultValue={item?.seo_title || ""} disabled={disabled || pending} />
            <small className="muted">空白時使用知識標題 fallback。</small>
          </div>
          <div className="field full">
            <span>Meta Description</span>
            <textarea className="textarea" name="meta_description" rows={3} defaultValue={item?.meta_description || ""} disabled={disabled || pending} />
            <small className="muted">空白時使用摘要或內文前段 fallback。</small>
          </div>
          <div className="field full">
            <span>Canonical</span>
            <input className="input" value={slugPreview} readOnly />
          </div>
        </div>
      </details>

      <details className="field full" open>
        <summary>法規 / 資料來源維護</summary>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <span>法規狀態</span>
            <select className="select" name="legal_status" defaultValue={selectedLegalStatus} disabled={disabled || pending}>
              <option value="">一般內容</option>
              {legalOptions.map((status) => (
                <option key={status} value={status}>{legalStatusLabels[status]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <span>複查週期（天）</span>
            <input className="input" type="number" min="1" name="review_cycle_days" defaultValue={item?.review_cycle_days || ""} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>有效起日</span>
            <input className="input" type="date" name="effective_from" defaultValue={dateInputValue(item?.effective_from)} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>有效迄日</span>
            <input className="input" type="date" name="effective_to" defaultValue={dateInputValue(item?.effective_to)} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>最後複查日</span>
            <input className="input" type="date" name="last_reviewed_at" defaultValue={dateInputValue(item?.last_reviewed_at)} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>下次複查日</span>
            <input className="input" type="date" name="next_review_at" defaultValue={dateInputValue(item?.next_review_at)} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>來源名稱</span>
            <input className="input" name="source_name" defaultValue={item?.source_name || ""} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>來源連結</span>
            <input className="input" name="source_url" defaultValue={item?.source_url || ""} disabled={disabled || pending} />
          </div>
        </div>
      </details>

      <div className="field full">
        <button className="button" type="submit" disabled={disabled || pending}>{pending ? "儲存中..." : item ? "儲存知識內容" : "建立草稿"}</button>
      </div>
    </form>
  );
}
