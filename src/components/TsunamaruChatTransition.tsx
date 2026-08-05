import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { ChatLauncher, ChatLauncherVisual } from "@/components/ChatLauncher";

export type ChatTransitionState = "closed" | "opening" | "open" | "closing";

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: number;
};

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export function TsunamaruChatTransition({
  children,
  mainColor,
  launcherPosition = "fixed",
  boundaryRef,
  forceMobile = false,
}: {
  children: (close: () => void) => ReactNode;
  mainColor: string;
  launcherPosition?: "fixed" | "absolute";
  boundaryRef?: RefObject<HTMLElement>;
  forceMobile?: boolean;
}) {
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const targetMeasureRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ChatTransitionState>("closed");
  const timersRef = useRef<number[]>([]);
  const framesRef = useRef<number[]>([]);
  const previousOverflowRef = useRef("");
  const bodyLockedRef = useRef(false);
  const [transitionState, setTransitionState] = useState<ChatTransitionState>("closed");
  const [launcherRect, setLauncherRect] = useState<Rect | null>(null);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [overlayRect, setOverlayRect] = useState<Rect | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [launcherCloneVisible, setLauncherCloneVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const duration = reducedMotion ? 40 : 600;
  const contentDelay = reducedMotion ? 0 : 200;

  const setState = useCallback((next: ChatTransitionState) => {
    stateRef.current = next;
    setTransitionState(next);
  }, []);

  const clearScheduledWork = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    for (const frame of framesRef.current) window.cancelAnimationFrame(frame);
    timersRef.current = [];
    framesRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }, []);

  const readBoundaryRect = useCallback((): Rect => {
    const boundary = boundaryRef?.current;
    if (boundary) {
      const rect = boundary.getBoundingClientRect();
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 0 };
    }
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, borderRadius: 0 };
  }, [boundaryRef]);

  const readTargetRect = useCallback((): Rect => {
    const boundary = readBoundaryRect();
    const target = targetMeasureRef.current;
    if (!target) return boundary;

    target.style.setProperty("--chat-boundary-top", `${boundary.top}px`);
    target.style.setProperty("--chat-boundary-left", `${boundary.left}px`);
    target.style.setProperty("--chat-boundary-width", `${boundary.width}px`);
    target.style.setProperty("--chat-boundary-height", `${boundary.height}px`);
    const rect = target.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      borderRadius: Number.parseFloat(window.getComputedStyle(target).borderRadius) || 0,
    };
  }, [readBoundaryRect]);

  const focusCloseButton = useCallback(() => {
    const closeButton = dialogRef.current?.querySelector<HTMLButtonElement>('[aria-label="チャットを閉じる"]');
    closeButton?.focus();
  }, []);

  const open = useCallback(() => {
    if (stateRef.current !== "closed" || !launcherRef.current) return;

    clearScheduledWork();
    const rect = launcherRef.current.getBoundingClientRect();
    setLauncherRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 9999 });
    setTargetRect(readTargetRect());
    setOverlayRect(readBoundaryRect());
    setExpanded(false);
    setContentVisible(false);
    setLauncherCloneVisible(true);
    setState("opening");

    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        setExpanded(true);
        schedule(() => setLauncherCloneVisible(false), Math.max(0, contentDelay - 20));
        schedule(() => setContentVisible(true), contentDelay);
        schedule(() => {
          setState("open");
          focusCloseButton();
        }, duration);
      });
      framesRef.current.push(secondFrame);
    });
    framesRef.current.push(firstFrame);
  }, [clearScheduledWork, contentDelay, duration, focusCloseButton, readBoundaryRect, readTargetRect, schedule, setState]);

  const close = useCallback(() => {
    if (stateRef.current !== "open" || !launcherRef.current) return;

    clearScheduledWork();
    setState("closing");
    setContentVisible(false);
    setLauncherCloneVisible(false);

    const rect = launcherRef.current.getBoundingClientRect();
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        setLauncherRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 9999 });
        setExpanded(false);
        schedule(() => setLauncherCloneVisible(true), reducedMotion ? 0 : 400);
        schedule(() => {
          setState("closed");
          setLauncherCloneVisible(false);
          setLauncherRect(null);
          setTargetRect(null);
          setOverlayRect(null);
          window.requestAnimationFrame(() => launcherRef.current?.focus());
        }, duration);
      });
      framesRef.current.push(secondFrame);
    });
    framesRef.current.push(firstFrame);
  }, [clearScheduledWork, duration, reducedMotion, schedule, setState]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (transitionState === "closed" && bodyLockedRef.current) {
      document.body.style.overflow = previousOverflowRef.current;
      bodyLockedRef.current = false;
      return;
    }
    if (transitionState === "opening" && !bodyLockedRef.current) {
      previousOverflowRef.current = document.body.style.overflow;
      bodyLockedRef.current = true;
    }
    if (bodyLockedRef.current) document.body.style.overflow = "hidden";
  }, [transitionState]);

  useEffect(() => {
    if (transitionState === "closed") return;
    const updateTarget = () => {
      setTargetRect(readTargetRect());
      setOverlayRect(readBoundaryRect());
    };
    window.addEventListener("resize", updateTarget);
    window.visualViewport?.addEventListener("resize", updateTarget);
    return () => {
      window.removeEventListener("resize", updateTarget);
      window.visualViewport?.removeEventListener("resize", updateTarget);
    };
  }, [readBoundaryRect, readTargetRect, transitionState]);

  useEffect(() => {
    if (transitionState === "closed") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || stateRef.current !== "open" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, transitionState]);

  useEffect(() => () => {
    clearScheduledWork();
    if (bodyLockedRef.current) {
      document.body.style.overflow = previousOverflowRef.current;
      bodyLockedRef.current = false;
    }
  }, [clearScheduledWork]);

  const visible = transitionState !== "closed" && launcherRect && targetRect;
  const currentRect = expanded ? targetRect : launcherRect;
  const shellStyle: CSSProperties | undefined = visible && currentRect
    ? {
        top: currentRect.top,
        left: currentRect.left,
        width: currentRect.width,
        height: currentRect.height,
        borderRadius: expanded ? targetRect.borderRadius : launcherRect.borderRadius,
        transition: `top ${duration}ms ${EASING}, left ${duration}ms ${EASING}, width ${duration}ms ${EASING}, height ${duration}ms ${EASING}, border-radius ${duration}ms ${EASING}, box-shadow ${duration}ms ${EASING}`,
        boxShadow: expanded
          ? `0 25px 70px rgba(15, 23, 42, 0.28), inset 0 3px 0 ${mainColor}`
          : `0 10px 30px rgba(15, 23, 42, 0.18), inset 0 0 0 1px ${mainColor}33`,
      }
    : undefined;

  return (
    <>
      <div
        ref={targetMeasureRef}
        aria-hidden="true"
        className={`tsunamaru-chat-target pointer-events-none invisible fixed ${forceMobile ? "tsunamaru-chat-target--force-mobile" : ""}`}
      />

      <div style={{ visibility: transitionState === "closed" ? "visible" : "hidden" }}>
        <ChatLauncher ref={launcherRef} position={launcherPosition} onOpen={open} />
      </div>

      {visible && overlayRect && (
        <>
          <button
            type="button"
            data-chat-transition-overlay
            aria-label="チャットの背景を閉じる"
            onClick={close}
            className={`tsunamaru-chat-overlay fixed z-[90] border-0 p-0 ${forceMobile ? "tsunamaru-chat-overlay--force-mobile" : ""}`}
            style={{
              top: overlayRect.top,
              left: overlayRect.left,
              width: overlayRect.width,
              height: overlayRect.height,
              opacity: expanded ? 1 : 0,
              transition: `opacity ${reducedMotion ? 1 : 420}ms ease`,
            }}
          />

          <div
            ref={dialogRef}
            data-chat-transition-state={transitionState}
            role="dialog"
            aria-modal="true"
            aria-label="つなまるAIチャット"
            className="fixed z-[100] overflow-hidden bg-white"
            style={shellStyle}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-end justify-end gap-2 bg-transparent"
              style={{
                opacity: launcherCloneVisible ? 1 : 0,
                transition: `opacity ${reducedMotion ? 1 : 160}ms ease`,
              }}
            >
              <ChatLauncherVisual />
            </div>

            <div
              data-chat-transition-content
              className="absolute inset-0 flex flex-col bg-white"
              style={{
                opacity: contentVisible ? 1 : 0,
                transform: contentVisible ? "translateY(0)" : "translateY(8px)",
                pointerEvents: transitionState === "open" ? "auto" : "none",
                transition: `opacity ${reducedMotion ? 1 : 280}ms ease, transform ${reducedMotion ? 1 : 280}ms ease`,
              }}
            >
              {children(close)}
            </div>
          </div>
        </>
      )}
    </>
  );
}
