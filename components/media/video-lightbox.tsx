"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  src: string;
  title?: string;
  poster?: string | null;
  onClose: () => void;
};

export function VideoLightbox({ open, src, title = "完整影片", poster, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    setFailed(false);
    closeRef.current?.focus();
    video?.load();
    void video?.play().catch(() => undefined);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      video?.pause();
      video?.removeAttribute("src");
      video?.load();
    };
  }, [onClose, open, src]);

  if (!open) return null;
  return (
    <div className="video-lightbox" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="video-lightbox-panel">
        <button ref={closeRef} className="video-lightbox-close" type="button" onClick={onClose} aria-label="關閉影片">×</button>
        {failed ? <div className="video-fallback"><img src={poster || ""} alt={title} onError={(event) => { event.currentTarget.hidden = true; }} /><p>影片無法播放</p></div> : (
          <video ref={videoRef} src={src} poster={poster || undefined} controls playsInline preload="metadata" aria-label={title}
            onError={() => setFailed(true)} onStalled={() => setFailed(true)} onAbort={() => setFailed(true)} />
        )}
      </div>
    </div>
  );
}
