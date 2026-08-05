import type { FAQ } from "@/types";
import { normalizeText, tokenize } from "./normalize";

export type MatchResult = {
  faq: FAQ | null;
  matched: boolean;
  method: "exact" | "keyword" | "partial" | "similarity" | "fallback";
};

function similarityScore(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.max(ta.size, tb.size);
}

export function matchFAQ(input: string, faqs: FAQ[]): MatchResult {
  const published = faqs.filter((f) => f.isPublished);
  const normInput = normalizeText(input);

  if (!normInput) {
    return { faq: null, matched: false, method: "fallback" };
  }

  // 1. Exact normalized question match
  for (const f of published) {
    if (normalizeText(f.question) === normInput) {
      return { faq: f, matched: true, method: "exact" };
    }
  }

  // 2. Keyword match
  let bestKeyword: FAQ | null = null;
  let bestKeywordHits = 0;
  for (const f of published) {
    let hits = 0;
    for (const kw of f.keywords) {
      const nkw = normalizeText(kw);
      if (nkw && normInput.includes(nkw)) hits++;
    }
    if (hits > bestKeywordHits) {
      bestKeywordHits = hits;
      bestKeyword = f;
    }
  }
  if (bestKeyword) {
    return { faq: bestKeyword, matched: true, method: "keyword" };
  }

  // 3. Partial title match
  for (const f of published) {
    const nq = normalizeText(f.question);
    if (nq.length > 3 && (normInput.includes(nq) || nq.includes(normInput))) {
      return { faq: f, matched: true, method: "partial" };
    }
  }

  // 4. Simple text similarity
  let bestSim: FAQ | null = null;
  let bestScore = 0;
  for (const f of published) {
    const score = similarityScore(input, f.question + " " + f.keywords.join(" "));
    if (score > bestScore) {
      bestScore = score;
      bestSim = f;
    }
  }
  if (bestSim && bestScore >= 0.34) {
    return { faq: bestSim, matched: true, method: "similarity" };
  }

  return { faq: null, matched: false, method: "fallback" };
}
