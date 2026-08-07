"use client";

import { useEffect, useRef } from "react";
import type { PropertyMedia } from "@/lib/properties/types";

type Props = {
  images: PropertyMedia[];
  activeIndex: number | null;
  title: string;
  onChange: (index: number) => void;
  onClose: () => void;
};

export function ImageLightbox({ images, activeIndex, title, onChange, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const open = activeIndex !== null && Boolean(images[activeIndex]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (images.length > 1 && activeIndex !== null && event.key === "ArrowLeft") {
        event.preventDefault();
        onChange((activeIndex - 1 + images.length) % images.length);
      }
      if (images.length > 1 && activeIndex !== null && event.key === "ArrowRight") {
        event.preventDefault();
        onChange((activeIndex + 1) % images.length);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, images.length, onChange, onClose, open]);

  if (!open || activeIndex === null) return null;
  const image = images[activeIndex];
  const previous = (activeIndex - 1 + images.length) % images.length;
  const next = (activeIndex + 1) % images.length;

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={`${title} 照片預覽`} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="image-lightbox-panel" onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
        <button ref={closeRef} className="image-lightbox-close" type="button" onClick={onClose} aria-label="關閉照片預覽">×</button>
        <img src={image.url} alt={image.alt_text || title} />
        {images.length > 1 ? (
          <>
            <button className="image-lightbox-nav is-previous" type="button" onClick={() => onChange(previous)} aria-label="上一張照片">‹</button>
            <button className="image-lightbox-nav is-next" type="button" onClick={() => onChange(next)} aria-label="下一張照片">›</button>
            <span className="image-lightbox-count" aria-live="polite">{activeIndex + 1} / {images.length}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
