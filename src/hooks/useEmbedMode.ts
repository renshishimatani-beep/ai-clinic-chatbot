import { useMemo } from "react";

export function useEmbedMode(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.location.hash.replace(/^#\/?/, "") === "embed";
  }, []);
}
