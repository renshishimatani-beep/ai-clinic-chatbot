// Normalize text for FAQ matching: lowercase, full-width -> half-width,
// katakana -> hiragana, strip common punctuation, collapse spaces.
export function normalizeText(input: string): string {
  let s = input.toLowerCase();

  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;

    // Full-width ASCII range (FF01-FF5E) -> half-width
    if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCodePoint(code - 0xfee0);
      continue;
    }
    // Full-width space -> normal space
    if (code === 0x3000) {
      out += " ";
      continue;
    }
    // Katakana (3041 range) -> Hiragana: 0x30A1-0x30F6 => -0x60
    if (code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCodePoint(code - 0x60);
      continue;
    }
    out += ch;
  }

  // Remove common punctuation (ASCII + Japanese)
  out = out.replace(/[.,!?;:'"()\[\]{}\/\\@#\$%\^&\*\-_=+~`|<>。，、・：「」『』！？…ー\-]/g, " ");

  // Collapse whitespace
  out = out.replace(/\s+/g, " ").trim();

  return out;
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((t) => t.length > 0);
}
