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
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    setFailed(false);
    closeRef.current?.focus();

    // Facebook / Instagram in-app browsers can emit transient stalled/abort
    // events while negotiating metadata or Range requests. Only a real media
    // error should switch the UI into failure mode.
    video?.load();
    void video?.play().catch(() => {
      // Autoplay may be rejected after React commits the dialog. Keep the
      // native controls available instead of treating this as playback failure.
    });

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
  }, [onClose, open, retryToken, src]);

  if (!open) return null;
  return (
    <div className="video-lightbox" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="video-lightbox-panel">
        <button ref={closeRef} className="video-lightbox-close" type="button" onClick={onClose} aria-label="關閉影片">×</button>
        {failed ? (
          <div className="video-fallback">
            {poster ? <img src={poster} alt={title} onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
            <p>影片載入失敗，請再試一次</p>
            <button type="button" onClick={() => {
              setFailed(false);
              setRetryToken((value) => value + 1);
            }}>重新載入影片</button>
          </div>
        ) : (
          <video
            key={retryToken}
            ref={videoRef}
            src={src}
            poster={poster || undefined}
            controls
            playsInline
            preload="metadata"
            aria-label={title}
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </div>
  );
}
