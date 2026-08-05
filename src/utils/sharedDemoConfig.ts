import type { ClinicInfo, FAQ, ProspectPreviewMode, SalesDemoFAQ, SalesDemoSettings } from "@/types";

export type SharedDemoFAQ = {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  actionType: FAQ["actionType"];
  actionLabel?: string;
  actionUrl?: string;
  sortOrder: number;
};

export type SharedDemoConfig = {
  version: 1;
  clinicName: string;
  doctorName?: string;
  departments?: string;
  postalCode?: string;
  phone?: string;
  address?: string;
  reservationUrl?: string;
  websiteUrl?: string;
  mainColor?: string;
  logoUrl?: string;
  openingHours?: string;
  receptionHours?: string;
  closedDays?: string;
  access?: string;
  parking?: string;
  paymentMethods?: string;
  medicalServices?: string;
  examinations?: string;
  healthCheckups?: string;
  vaccinations?: string;
  feverInstructions?: string;
  firstVisitItems?: string;
  prospectWebsiteUrl?: string;
  prospectWebsiteName?: string;
  prospectWebsiteScreenshotUrl?: string;
  prospectPreviewMode?: ProspectPreviewMode;
  faqs?: SharedDemoFAQ[];
};

type StringKey = Exclude<keyof SharedDemoConfig, "version" | "faqs">;

const MAX_LENGTHS: Record<StringKey, number> = {
  clinicName: 100,
  doctorName: 100,
  departments: 200,
  postalCode: 20,
  phone: 30,
  address: 300,
  reservationUrl: 500,
  websiteUrl: 500,
  mainColor: 7,
  logoUrl: 500,
  openingHours: 500,
  receptionHours: 500,
  closedDays: 500,
  access: 500,
  parking: 500,
  paymentMethods: 1_000,
  medicalServices: 2_000,
  examinations: 2_000,
  healthCheckups: 1_000,
  vaccinations: 1_000,
  feverInstructions: 2_000,
  firstVisitItems: 1_000,
  prospectWebsiteUrl: 500,
  prospectWebsiteName: 100,
  prospectWebsiteScreenshotUrl: 500,
  prospectPreviewMode: 10,
};

const SHARED_KEYS = Object.keys(MAX_LENGTHS) as StringKey[];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const BASE64_URL = /^[A-Za-z0-9_-]+$/;
const MAX_PAYLOAD_LENGTH = 100_000;
const MAX_SHARED_FAQS = 30;
const SHARED_FAQ_ERROR = "共有可能なFAQ数または文字数の上限を超えています。公開するFAQを減らすか、回答文を短くしてください。";
const FAQ_ACTION_TYPES: FAQ["actionType"][] = ["none", "phone", "reservation", "link"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isAllowedFaqActionUrl(value: string): boolean {
  if (isHttpUrl(value)) return true;
  if (!value.startsWith("tel:")) return false;
  return /^tel:[+\d][+\d().\-\s]{0,29}$/.test(value);
}

function isAllowedLogoUrl(value: string): boolean {
  if (isHttpUrl(value)) return true;
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("..") && !value.includes("\\");
}

export function normalizeProspectWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (/^[A-Za-z][A-Za-z\d+.-]*:/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validateProspectWebsiteUrl(value: string): boolean {
  if (!value || /[<>]/.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

export function validateProspectScreenshotUrl(value: string): boolean {
  if (!value || /[<>]/.test(value) || value.startsWith("data:")) return false;
  if (isAllowedLogoUrl(value) && value.startsWith("/")) return true;
  return validateProspectWebsiteUrl(value);
}

export function validateSharedDemoConfig(input: unknown): SharedDemoConfig | null {
  if (!isRecord(input) || input.version !== 1) return null;

  const result: Partial<Record<StringKey, string>> & { version: 1 } = { version: 1 };

  for (const key of SHARED_KEYS) {
    const value = input[key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string" || value.length > MAX_LENGTHS[key] || containsControlCharacter(value)) {
      return null;
    }
    result[key] = value;
  }

  if (!result.clinicName?.trim()) return null;
  result.clinicName = result.clinicName.trim();

  if (result.mainColor && !HEX_COLOR.test(result.mainColor)) return null;
  if (result.reservationUrl && !isHttpUrl(result.reservationUrl)) return null;
  if (result.websiteUrl && !isHttpUrl(result.websiteUrl)) return null;
  if (result.logoUrl && !isAllowedLogoUrl(result.logoUrl)) return null;
  if (result.prospectWebsiteUrl && !validateProspectWebsiteUrl(result.prospectWebsiteUrl)) return null;
  if (result.prospectWebsiteScreenshotUrl && !validateProspectScreenshotUrl(result.prospectWebsiteScreenshotUrl)) return null;
  if (result.prospectPreviewMode && !["auto", "iframe", "screenshot"].includes(result.prospectPreviewMode)) return null;

  const faqs = validateSharedFaqs(input.faqs);
  if (input.faqs !== undefined && !faqs) return null;

  return { ...result, faqs: faqs?.length ? faqs : undefined } as SharedDemoConfig;
}

function validLimitedString(value: unknown, maxLength: number, required = false): value is string {
  if (typeof value !== "string" || value.length > maxLength || containsControlCharacter(value)) return false;
  return !required || value.trim().length > 0;
}

function validateSharedFaqs(value: unknown): SharedDemoFAQ[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_SHARED_FAQS) return null;

  const faqs: SharedDemoFAQ[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    if (!validLimitedString(item.id, 100, true)) return null;
    if (!validLimitedString(item.category, 50, true)) return null;
    if (!validLimitedString(item.question, 200, true)) return null;
    if (!validLimitedString(item.answer, 2_000, true)) return null;
    if (!Array.isArray(item.keywords) || item.keywords.length > 20) return null;
    const keywords = item.keywords.filter((keyword): keyword is string => validLimitedString(keyword, 50, true));
    if (keywords.length !== item.keywords.length) return null;
    if (!FAQ_ACTION_TYPES.includes(item.actionType as FAQ["actionType"])) return null;
    if (item.actionLabel !== undefined && !validLimitedString(item.actionLabel, 100)) return null;
    if (item.actionUrl !== undefined && !validLimitedString(item.actionUrl, 500)) return null;
    if (item.actionUrl && !isAllowedFaqActionUrl(item.actionUrl)) return null;
    if (!Number.isInteger(item.sortOrder) || (item.sortOrder as number) < 0 || (item.sortOrder as number) > 10_000) return null;

    faqs.push({
      id: item.id,
      category: item.category,
      question: item.question,
      answer: item.answer,
      keywords,
      actionType: item.actionType as FAQ["actionType"],
      actionLabel: typeof item.actionLabel === "string" && item.actionLabel ? item.actionLabel : undefined,
      actionUrl: typeof item.actionUrl === "string" && item.actionUrl ? item.actionUrl : undefined,
      sortOrder: item.sortOrder as number,
    });
  }
  return faqs.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function encodeSharedDemoConfig(config: SharedDemoConfig): string {
  const validated = validateSharedDemoConfig(config);
  if (!validated) throw new Error("共有用の商談設定が不正です。");

  const bytes = new TextEncoder().encode(JSON.stringify(validated));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeSharedDemoConfig(payload: string): SharedDemoConfig | null {
  if (!payload || payload.length > MAX_PAYLOAD_LENGTH || !BASE64_URL.test(payload)) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return validateSharedDemoConfig(JSON.parse(json));
  } catch {
    return null;
  }
}

export function createSharedDemoConfig(settings: SalesDemoSettings, fallbackFaqs: FAQ[] = []): SharedDemoConfig {
  const publishedSalesFaqs = [...settings.faqs].filter((faq) => faq.isPublished);
  const sourceFaqs = publishedSalesFaqs.length > 0
    ? publishedSalesFaqs
    : fallbackFaqs.filter((faq) => faq.isPublished);
  const publicFaqs = sourceFaqs
    .filter((faq) => faq.isPublished)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map<SharedDemoFAQ>((faq) => ({
      id: faq.id,
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      keywords: [...faq.keywords],
      actionType: faq.actionType,
      actionLabel: faq.actionLabel || undefined,
      actionUrl: faq.actionUrl || undefined,
      sortOrder: faq.sortOrder ?? 0,
    }));
  if (!validateSharedFaqs(publicFaqs)) throw new Error(SHARED_FAQ_ERROR);

  const candidate: SharedDemoConfig = {
    version: 1,
    clinicName: settings.clinicName,
    doctorName: settings.doctorName || undefined,
    departments: settings.departments || undefined,
    postalCode: settings.postalCode || undefined,
    phone: settings.phone || undefined,
    address: settings.address || undefined,
    reservationUrl: settings.reservationUrl || undefined,
    websiteUrl: settings.websiteUrl || undefined,
    mainColor: settings.mainColor || undefined,
    logoUrl: settings.logoUrl || undefined,
    openingHours: settings.openingHours || undefined,
    receptionHours: settings.receptionHours || undefined,
    closedDays: settings.closedDays || undefined,
    access: settings.access || undefined,
    parking: settings.parking || undefined,
    paymentMethods: settings.paymentMethods || undefined,
    medicalServices: settings.medicalServices || undefined,
    examinations: settings.examinations || undefined,
    healthCheckups: settings.healthCheckups || undefined,
    vaccinations: settings.vaccinations || undefined,
    feverInstructions: settings.feverInstructions || undefined,
    firstVisitItems: settings.firstVisitItems || undefined,
    prospectWebsiteUrl: settings.prospectWebsiteUrl
      ? normalizeProspectWebsiteUrl(settings.prospectWebsiteUrl)
      : undefined,
    prospectWebsiteName: settings.prospectWebsiteName || undefined,
    prospectWebsiteScreenshotUrl: settings.prospectWebsiteScreenshotUrl
      ? normalizeProspectWebsiteUrl(settings.prospectWebsiteScreenshotUrl)
      : undefined,
    // IndexedDB内のローカル画像は共有できないため、公開URLがない場合はiframeへ安全にフォールバックする。
    prospectPreviewMode: settings.prospectPreviewMode === "screenshot" && !settings.prospectWebsiteScreenshotUrl
      ? "auto"
      : settings.prospectPreviewMode,
    faqs: publicFaqs.length ? publicFaqs : undefined,
  };

  const settingsOnly = validateSharedDemoConfig({ ...candidate, faqs: undefined });
  if (!settingsOnly) throw new Error("共有可能な医院情報またはURL設定を確認してください。");

  const validated = validateSharedDemoConfig(candidate);
  if (!validated) throw new Error(SHARED_FAQ_ERROR);
  return validated;
}

export function applySharedDemoConfigToClinicInfo(
  base: ClinicInfo,
  shared: SharedDemoConfig,
): ClinicInfo {
  return {
    ...base,
    clinicName: shared.clinicName,
    doctorName: shared.doctorName ?? base.doctorName,
    departments: shared.departments ?? base.departments,
    postalCode: shared.postalCode ?? base.postalCode,
    phone: shared.phone ?? base.phone,
    address: shared.address ?? base.address,
    reservationUrl: shared.reservationUrl ?? base.reservationUrl,
    websiteUrl: shared.websiteUrl ?? base.websiteUrl,
    openingHours: shared.openingHours ?? base.openingHours,
    receptionHours: shared.receptionHours ?? base.receptionHours,
    closedDays: shared.closedDays ?? base.closedDays,
    access: shared.access ?? base.access,
    parking: shared.parking ?? base.parking,
    paymentMethods: shared.paymentMethods ?? base.paymentMethods,
    medicalServices: shared.medicalServices ?? base.medicalServices,
    examinations: shared.examinations ?? base.examinations,
    healthCheckups: shared.healthCheckups ?? base.healthCheckups,
    vaccinations: shared.vaccinations ?? base.vaccinations,
    feverInstructions: shared.feverInstructions ?? base.feverInstructions,
    firstVisitRequirements: shared.firstVisitItems ?? base.firstVisitRequirements,
  };
}

export function sharedDemoFaqsToFaqs(faqs: SharedDemoFAQ[] | undefined): FAQ[] {
  if (!faqs?.length) return [];
  return faqs.map((faq) => ({
    ...faq,
    keywords: [...faq.keywords],
    isPublished: true,
    updatedAt: "",
  }));
}

export function salesDemoFaqsToFaqs(faqs: SalesDemoFAQ[]): FAQ[] {
  return [...faqs]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((faq) => ({ ...faq, keywords: [...faq.keywords] }));
}
