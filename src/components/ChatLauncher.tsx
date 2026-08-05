import { forwardRef, useState } from "react";

export const ChatLauncher = forwardRef<HTMLButtonElement, {
  onOpen: () => void;
  position?: "fixed" | "absolute";
}>(function ChatLauncher({
  onOpen,
  position = "fixed",
}, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      className={`${position} bottom-3 right-2 z-40 flex max-w-[calc(100%_-_1rem)] items-end gap-2 bg-transparent p-0 launcher-float sm:bottom-4 sm:right-4`}
      aria-label="つなまるAIに質問する"
    >
      <ChatLauncherVisual />
    </button>
  );
});

export function ChatLauncherVisual() {
  const [imageVisible, setImageVisible] = useState(true);

  return (
    <>
      <span className="relative mb-10 max-w-[170px] break-words rounded-2xl border border-sky-100 bg-white px-3 py-2.5 text-left text-xs font-bold leading-relaxed text-slate-700 shadow-lg sm:mb-12 sm:max-w-[210px] sm:px-4 sm:py-3 sm:text-sm">
        詳しくは僕が答えるよ！
        <span
          aria-hidden="true"
          className="absolute -right-2 bottom-3 h-4 w-4 rotate-45 border-r border-t border-sky-100 bg-white"
        />
      </span>

      {imageVisible && (
        <img
          src="/images/tsunamaru/tsunamaru-transparent.png"
          alt=""
          className="h-[72px] w-[72px] shrink-0 bg-transparent object-contain object-center sm:h-[88px] sm:w-[88px]"
          onError={() => setImageVisible(false)}
          draggable={false}
        />
      )}
    </>
  );
}
