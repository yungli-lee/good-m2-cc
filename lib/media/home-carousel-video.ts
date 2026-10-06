export type HomeCarouselVideoElement = {
  currentTime: number;
  dataset: { videoSrc?: string };
  hidden: boolean;
  preload: string;
  readyState: number;
  addEventListener(type: string, listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: string, listener: () => void): void;
  getAttribute(name: string): string | null;
  load(): void;
  pause(): void;
  play(): Promise<void> | void;
  removeAttribute(name: string): void;
  setAttribute(name: string, value: string): void;
};

const pendingCanPlay = new WeakMap<object, () => void>();

function cancelPendingPlay(video: HomeCarouselVideoElement) {
  const handler = pendingCanPlay.get(video);
  if (!handler) return;
  video.removeEventListener("canplay", handler);
  pendingCanPlay.delete(video);
}

function resetCurrentTime(video: HomeCarouselVideoElement) {
  try {
    video.currentTime = 0;
  } catch {
    // Safari can reject seeking until metadata is available. The canplay handler retries it.
  }
}

export function deactivateHomeCarouselVideo(video: HomeCarouselVideoElement) {
  cancelPendingPlay(video);
  video.pause();
  resetCurrentTime(video);
  video.removeAttribute("src");
  video.preload = "none";
  video.load();
}

export function isActiveHomeCarouselVideoFailure(
  video: HomeCarouselVideoElement,
  videoIndex: number,
  activeIndex: number
) {
  return videoIndex === activeIndex && Boolean(video.getAttribute("src"));
}

type ActivateOptions = {
  reducedMotion?: boolean;
  onPlayRejected?: () => void;
};

export function activateHomeCarouselVideo(video: HomeCarouselVideoElement, options: ActivateOptions = {}) {
  cancelPendingPlay(video);
  video.pause();
  video.hidden = false;
  resetCurrentTime(video);
  video.removeAttribute("src");

  const source = video.dataset.videoSrc;
  if (!source) return false;

  video.preload = "metadata";
  video.setAttribute("src", source);
  video.load();
  resetCurrentTime(video);

  if (options.reducedMotion) return true;

  const play = () => {
    pendingCanPlay.delete(video);
    resetCurrentTime(video);
    try {
      const result = video.play();
      if (result && typeof result.catch === "function") {
        void result.catch(() => options.onPlayRejected?.());
      }
    } catch {
      options.onPlayRejected?.();
    }
  };

  if (video.readyState >= 2) play();
  else {
    pendingCanPlay.set(video, play);
    video.addEventListener("canplay", play, { once: true });
  }

  return true;
}
