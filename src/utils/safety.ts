import { normalizeText } from "./normalize";

export type SafetyResult = "emergency" | "medical" | null;

const EMERGENCY_PHRASES = [
  "cannot breathe",
  "cant breathe",
  "unconscious",
  "severe chest pain",
  "heavy bleeding",
  "ambulance",
  "emergency",
  "call 911",
  "救急",
  "意識がない",
  "呼吸できない",
  "救急車",
  "息ができない",
  "胸の激痛",
  "大量の出血",
];

const MEDICAL_PHRASES = [
  "diagnose me",
  "diagnose",
  "what disease",
  "what illness",
  "medication",
  "medicine",
  "stop taking medicine",
  "stop my medicine",
  "test result",
  "lab result",
  "treatment",
  "prescribe",
  "prescription",
  "what should i take",
  "is it cancer",
  "do i have",
  "診断",
  "病名",
  "薬",
  "服薬",
  "検査結果",
  "治療",
  "投薬",
  "処方",
  "病気",
];

export function checkSafety(input: string): SafetyResult {
  const text = normalizeText(input);

  for (const phrase of EMERGENCY_PHRASES) {
    if (text.includes(normalizeText(phrase))) return "emergency";
  }
  for (const phrase of MEDICAL_PHRASES) {
    if (text.includes(normalizeText(phrase))) return "medical";
  }
  return null;
}

export const MEDICAL_RESPONSE =
  "つなまるAIは、症状の診断や個別の治療・服薬に関するご案内を行うことはできません。診療時間内にクリニックまでお問い合わせください。";

export const EMERGENCY_RESPONSE =
  "緊急の医療対応が必要な可能性があります。呼吸困難・意識消失・胸の激痛・大量の出血がある場合は、ただちに救急サービス（119番）へご連絡ください。";
