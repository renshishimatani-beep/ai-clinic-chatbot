import { useState } from "react";

export type CharacterState =
  | "welcome"
  | "thinking"
  | "answer"
  | "sorry"
  | "phone"
  | "reservation"
  | "admin";

const DEFAULT_SRC = "/images/tsunamaru/tsunamaru-transparent.png";

function animationClass(state: CharacterState): string {
  switch (state) {
    case "welcome":
      return "char-fade-in char-float";
    case "thinking":
      return "char-side";
    case "answer":
      return "char-bounce";
    default:
      return "char-float";
  }
}

export function Character({
  state,
  size = 64,
  className = "",
  alt = "Tsunamaru",
}: {
  state: CharacterState;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      className={`shrink-0 bg-transparent ${animationClass(state)} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={DEFAULT_SRC}
        onError={() => setVisible(false)}
        alt={alt}
        draggable={false}
        className="h-full w-full select-none object-contain object-center bg-transparent"
      />
    </div>
  );
}
