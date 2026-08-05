import type { ImportedClinicInfo, ImportedFAQ, ImportedSourcePage, SalesDemoSettings } from "@/types";
import { uid } from "@/services/storage";

const ACTION_TYPES = ["none", "phone", "reservation", "link"] as const;
const SAFE_ACTION_URL = /^(https?:|tel:)/i;
const SAFE_HTTP_URL = /^https?:/i;
const CLINIC_INFO_KEYS: (keyof ImportedClinicInfo)[] = ["clinicName", "doctorName", "departments", "phone", "postalCode", "address", "openingHours", "receptionHours", "closedDays", "access", "parking", "reservationUrl", "websiteUrl", "paymentMethods", "medicalServices", "examinations", "healthCheckups", "vaccinations", "feverInstructions", "firstVisitItems"];

export type ImportedWebsiteResult = {
  websiteAccessStatus: "success" | "failed";
  websiteAccessMessage: string;
  clinicInfo: ImportedClinicInfo;
  faqs: ImportedFAQ[];
  sourcePages: ImportedSourcePage[];
};

export function generateExternalFaqPrompt(settings: SalesDemoSettings): string {
  return `あなたは、クリニックの患者さま向け案内情報とFAQを作成するアシスタントです。

以下のクリニック公式ホームページを実際に開き、トップページと同一ドメイン内の主要ページを確認してください。

【公式ホームページ】

${settings.prospectWebsiteUrl}

【確認するページ】

・トップページ
・診療案内
・診療科
・初診の方へ
・診療時間
・アクセス
・予約案内
・発熱患者さまへの案内
・健康診断
・予防接種
・検査
・医師紹介
・よくある質問
・支払い方法
・院内設備

サイト内に存在しないページを無理に探す必要はありません。

【現在登録されている参考情報】

クリニック名：
${settings.clinicName}

院長名：
${settings.doctorName}

診療科：
${settings.departments}

電話番号：
${settings.phone}

郵便番号：
${settings.postalCode}

住所：
${settings.address}

診療時間：
${settings.openingHours}

休診日：
${settings.closedDays}

アクセス：
${settings.access}

駐車場：
${settings.parking}

Web予約URL：
${settings.reservationUrl}

【重要なルール】

・公式ホームページ内の情報だけを根拠にしてください
・検索結果、口コミサイト、まとめサイト、SNSの情報は使用しないでください
・HPに記載されていない内容は推測しないでください
・一般的な医療情報を、この医院独自の情報として回答しないでください
・電話番号、住所、診療時間、休診日、予約URLは公式HPの表記と一致させてください
・情報が確認できない項目は空文字にしてください
・診断、治療判断、病名の断定、薬の変更指示は行わないでください
・患者さまが理解しやすい丁寧な日本語でFAQを作成してください
・類似する質問は重複させないでください
・FAQは患者さまから質問される可能性が高い順に15件から25件作成してください
・必ず指定されたJSON形式だけで回答してください
・JSONの前後に説明文やMarkdownのコードブロックを付けないでください
・公式HPへアクセスできなかった場合は、事実を推測せずwebsiteAccessStatusをfailedにしてください

【出力形式】

{
  "websiteAccessStatus": "success",
  "websiteAccessMessage": "",
  "clinicInfo": {
    "clinicName": "", "doctorName": "", "departments": "", "phone": "", "postalCode": "", "address": "",
    "openingHours": "", "receptionHours": "", "closedDays": "", "access": "", "parking": "",
    "reservationUrl": "", "websiteUrl": "", "paymentMethods": "", "medicalServices": "", "examinations": "",
    "healthCheckups": "", "vaccinations": "", "feverInstructions": "", "firstVisitItems": ""
  },
  "faqs": [
    {
      "category": "予約", "question": "予約はできますか？", "answer": "公式ホームページに掲載されている内容をもとにした回答",
      "keywords": ["予約", "Web予約", "ネット予約", "予約方法"], "actionType": "reservation",
      "actionLabel": "Web予約", "actionUrl": "", "isPublished": true,
      "sourceTitle": "予約案内", "sourceUrl": "確認した公式HPのURL"
    }
  ],
  "sourcePages": [{ "title": "ページタイトル", "url": "確認した公式HPのURL" }]
}

【actionType】

ボタン不要：none
電話ボタン：phone
Web予約ボタン：reservation
公式HP内の別ページへのリンク：link

公式HPの情報だけを根拠として、基本情報と患者さま向けFAQを作成してください。`;
}

export function parseImportedWebsiteResult(raw: string): ImportedWebsiteResult {
  const parsed = parseWrappedJson(raw);
  if (!isRecord(parsed) || (parsed.websiteAccessStatus !== "success" && parsed.websiteAccessStatus !== "failed")) throw new Error("invalid-status");
  const websiteAccessMessage = optionalString(parsed.websiteAccessMessage, 500) || "";
  if (parsed.websiteAccessStatus === "failed") return { websiteAccessStatus: "failed", websiteAccessMessage, clinicInfo: {}, faqs: [], sourcePages: [] };
  if (!isRecord(parsed.clinicInfo) || !Array.isArray(parsed.faqs) || parsed.faqs.length > 30) throw new Error("invalid-result");
  const clinicInfo = normalizeClinicInfo(parsed.clinicInfo);
  const faqs = parsed.faqs.map(normalizeImportedFaq);
  const sourcePages = Array.isArray(parsed.sourcePages) ? parsed.sourcePages.slice(0, 50).map(normalizeSourcePage) : [];
  return { websiteAccessStatus: "success", websiteAccessMessage, clinicInfo, faqs, sourcePages };
}

function parseWrappedJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = trimmed.indexOf("{"); const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start || start > 500 || trimmed.length - end - 1 > 500) throw new Error("invalid-json-object");
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

function normalizeClinicInfo(value: Record<string, unknown>): ImportedClinicInfo {
  return CLINIC_INFO_KEYS.reduce<ImportedClinicInfo>((result, key) => {
    const max = key.endsWith("Url") ? 500 : 2_000;
    const candidate = optionalString(value[key], max) || "";
    if (key.endsWith("Url") && candidate && !SAFE_HTTP_URL.test(candidate)) throw new Error("invalid-clinic-url");
    result[key] = candidate;
    return result;
  }, {});
}

function normalizeImportedFaq(value: unknown): ImportedFAQ {
  if (!isRecord(value)) throw new Error("invalid-faq");
  const category = requiredString(value.category, 50); const question = requiredString(value.question, 200); const answer = requiredString(value.answer, 2_000);
  if (!Array.isArray(value.keywords) || value.keywords.length > 20) throw new Error("invalid-keywords");
  const keywords = value.keywords.map((keyword) => requiredString(keyword, 50));
  const actionType = ACTION_TYPES.includes(value.actionType as typeof ACTION_TYPES[number]) ? value.actionType as typeof ACTION_TYPES[number] : "none";
  const actionUrl = optionalString(value.actionUrl, 500); const sourceUrl = optionalString(value.sourceUrl, 500);
  if (actionUrl && !SAFE_ACTION_URL.test(actionUrl)) throw new Error("invalid-action-url");
  if (sourceUrl && !SAFE_HTTP_URL.test(sourceUrl)) throw new Error("invalid-source-url");
  return { id: uid(), selected: true, category, question, answer, keywords, actionType, actionLabel: optionalString(value.actionLabel, 100), actionUrl, isPublished: typeof value.isPublished === "boolean" ? value.isPublished : true, sourceTitle: optionalString(value.sourceTitle, 200), sourceUrl };
}

function normalizeSourcePage(value: unknown): ImportedSourcePage {
  if (!isRecord(value)) throw new Error("invalid-source-page");
  const title = requiredString(value.title, 200); const url = requiredString(value.url, 500);
  if (!SAFE_HTTP_URL.test(url)) throw new Error("invalid-source-page-url");
  return { title, url };
}

function requiredString(value: unknown, max: number): string { if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("invalid-string"); return value.trim(); }
function optionalString(value: unknown, max: number): string | undefined { if (value === null || value === undefined || value === "") return undefined; if (typeof value !== "string" || value.length > max) throw new Error("invalid-string"); return value.trim() || undefined; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
export function normalizeQuestionForDuplicate(value: string): string { return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, ""); }
