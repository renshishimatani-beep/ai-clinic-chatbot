import type { FAQ, ImportedClinicInfo, ImportedFAQ, ImportedSourcePage, SalesDemoFAQ, SalesDemoSettings, SalesDemoWebsiteSource } from "@/types";
import { createSampleSalesDemoFaqs } from "@/data/salesDemoFaqs";

const KEY = "tsunamaru_sales_demo_settings";
export const SALES_DEMO_DATA_VERSION = 6;

const DEFAULT_DEMO_SETTINGS: Omit<SalesDemoSettings, "faqs"> = {
  dataVersion: SALES_DEMO_DATA_VERSION,
  clinicName: "みなと海浜クリニック",
  doctorName: "港 太郎",
  departments: "内科・小児科",
  phone: "03-1234-5678",
  postalCode: "",
  address: "東京都港区海岸1-2-3",
  reservationUrl: "https://example.com/reservation",
  websiteUrl: "https://example.com",
  mainColor: "#3BA9D4",
  logoUrl: "",
  openingHours: "月〜金 9:00〜12:30 / 15:00〜18:00、土 9:00〜12:00",
  receptionHours: "",
  closedDays: "日曜日・祝日",
  access: "みなと駅北口から徒歩3分です。",
  parking: "クリニック裏に無料駐車場5台分があります。",
  paymentMethods: "",
  medicalServices: "",
  examinations: "",
  healthCheckups: "",
  vaccinations: "",
  feverInstructions: "",
  firstVisitItems: "",
  prospectWebsiteUrl: "",
  prospectWebsiteName: "",
  prospectWebsiteScreenshotUrl: "",
  prospectWebsiteScreenshotStorageKey: "",
  prospectPreviewMode: "auto",
  websiteSources: [],
  generatedFaqPrompt: "",
  lastImportedAiResponse: "",
  importedFaqCandidates: [],
  importedClinicInfoCandidate: {},
  importedSourcePages: [],
  salesMemo: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migrateSalesDemoSettings(value: unknown): SalesDemoSettings {
  const parsed = isRecord(value) ? value : {};
  const faqs = Array.isArray(parsed.faqs)
    ? parsed.faqs.flatMap((faq, index) => normalizeFaq(faq, index))
    : createSampleSalesDemoFaqs();
  const migrated = { ...DEFAULT_DEMO_SETTINGS, faqs } as SalesDemoSettings;
  for (const key of Object.keys(DEFAULT_DEMO_SETTINGS) as (keyof typeof DEFAULT_DEMO_SETTINGS)[]) {
    if (key === "dataVersion") continue;
    const candidate = parsed[key];
    if (typeof candidate === "string") {
      (migrated[key] as string) = candidate;
    }
  }
  migrated.websiteSources = Array.isArray(parsed.websiteSources)
    ? parsed.websiteSources.flatMap(normalizeWebsiteSource)
    : [];
  migrated.importedFaqCandidates = Array.isArray(parsed.importedFaqCandidates)
    ? parsed.importedFaqCandidates.slice(0, 30).flatMap(normalizeImportedFaq)
    : [];
  migrated.importedClinicInfoCandidate = normalizeClinicInfoCandidate(parsed.importedClinicInfoCandidate);
  migrated.importedSourcePages = Array.isArray(parsed.importedSourcePages)
    ? parsed.importedSourcePages.slice(0, 50).flatMap(normalizeSourcePage)
    : [];
  if (!['auto', 'iframe', 'screenshot'].includes(migrated.prospectPreviewMode)) migrated.prospectPreviewMode = 'auto';
  if (parsed.dataVersion !== SALES_DEMO_DATA_VERSION && migrated.prospectPreviewMode === "screenshot") {
    // v5ではプレビューを開くだけでscreenshotへ強制更新されていたため、iframe優先の初期値へ戻す。
    migrated.prospectPreviewMode = "auto";
  }
  migrated.dataVersion = SALES_DEMO_DATA_VERSION;
  return migrated;
}

const FAQ_ACTION_TYPES: FAQ["actionType"][] = ["none", "phone", "reservation", "link"];

function normalizeFaq(value: unknown, index: number): SalesDemoFAQ[] {
  if (!isRecord(value)) return [];
  if (typeof value.question !== "string" || typeof value.answer !== "string") return [];
  const actionType = FAQ_ACTION_TYPES.includes(value.actionType as FAQ["actionType"])
    ? value.actionType as FAQ["actionType"]
    : "none";
  return [{
    id: typeof value.id === "string" && value.id ? value.id : `sales-migrated-${index + 1}`,
    category: typeof value.category === "string" ? value.category : "その他",
    question: value.question,
    answer: value.answer,
    keywords: Array.isArray(value.keywords) ? value.keywords.filter((keyword): keyword is string => typeof keyword === "string") : [],
    actionType,
    actionLabel: typeof value.actionLabel === "string" ? value.actionLabel : undefined,
    actionUrl: typeof value.actionUrl === "string" ? value.actionUrl : undefined,
    isPublished: typeof value.isPublished === "boolean" ? value.isPublished : true,
    sortOrder: Number.isInteger(value.sortOrder) ? value.sortOrder as number : index + 1,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    origin: value.origin === "external-ai" ? "external-ai" : value.origin === "manual" ? "manual" : undefined,
    sourceTitle: typeof value.sourceTitle === "string" ? value.sourceTitle : undefined,
    sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl : undefined,
  }];
}

function normalizeWebsiteSource(value: unknown): SalesDemoWebsiteSource[] {
  if (!isRecord(value) || typeof value.title !== "string" || typeof value.content !== "string") return [];
  const now = new Date().toISOString();
  return [{
    id: typeof value.id === "string" && value.id ? value.id : `source-${now}-${Math.random().toString(36).slice(2)}`,
    title: value.title.slice(0, 200),
    url: typeof value.url === "string" ? value.url.slice(0, 500) : undefined,
    content: value.content.slice(0, 20_000),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
  }];
}

function normalizeImportedFaq(value: unknown): ImportedFAQ[] {
  if (!isRecord(value) || typeof value.question !== "string" || typeof value.answer !== "string") return [];
  const actionType = FAQ_ACTION_TYPES.includes(value.actionType as FAQ["actionType"])
    ? value.actionType as FAQ["actionType"]
    : "none";
  return [{
    id: typeof value.id === "string" && value.id ? value.id : `candidate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    selected: typeof value.selected === "boolean" ? value.selected : true,
    category: typeof value.category === "string" ? value.category.slice(0, 50) : "その他",
    question: value.question.slice(0, 200),
    answer: value.answer.slice(0, 2_000),
    keywords: Array.isArray(value.keywords) ? value.keywords.filter((keyword): keyword is string => typeof keyword === "string").slice(0, 20).map((keyword) => keyword.slice(0, 50)) : [],
    actionType,
    actionLabel: typeof value.actionLabel === "string" ? value.actionLabel.slice(0, 100) : undefined,
    actionUrl: typeof value.actionUrl === "string" ? value.actionUrl.slice(0, 500) : undefined,
    isPublished: typeof value.isPublished === "boolean" ? value.isPublished : true,
    sourceTitle: typeof value.sourceTitle === "string" ? value.sourceTitle.slice(0, 200) : undefined,
    sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl.slice(0, 500) : undefined,
  }];
}

const CLINIC_INFO_KEYS: (keyof ImportedClinicInfo)[] = ["clinicName", "doctorName", "departments", "phone", "postalCode", "address", "openingHours", "receptionHours", "closedDays", "access", "parking", "reservationUrl", "websiteUrl", "paymentMethods", "medicalServices", "examinations", "healthCheckups", "vaccinations", "feverInstructions", "firstVisitItems"];

function normalizeClinicInfoCandidate(value: unknown): ImportedClinicInfo {
  if (!isRecord(value)) return {};
  return CLINIC_INFO_KEYS.reduce<ImportedClinicInfo>((result, key) => {
    if (typeof value[key] === "string") result[key] = value[key].slice(0, key.endsWith("Url") ? 500 : 2_000);
    return result;
  }, {});
}

function normalizeSourcePage(value: unknown): ImportedSourcePage[] {
  if (!isRecord(value) || typeof value.title !== "string" || typeof value.url !== "string" || !/^https?:\/\//i.test(value.url)) return [];
  return [{ title: value.title.slice(0, 200), url: value.url.slice(0, 500) }];
}

export function getSalesDemoSettings(): SalesDemoSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const initial = defaultSalesDemoSettings();
      setSalesDemoSettings(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as unknown;
    const migrated = migrateSalesDemoSettings(parsed);
    if (!isRecord(parsed) || parsed.dataVersion !== SALES_DEMO_DATA_VERSION || !Array.isArray(parsed.faqs)) {
      setSalesDemoSettings(migrated);
    }
    return migrated;
  } catch {
    return defaultSalesDemoSettings();
  }
}

export function setSalesDemoSettings(settings: SalesDemoSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...settings, dataVersion: SALES_DEMO_DATA_VERSION }));
  } catch {
    /* ignore quota errors */
  }
}

export function defaultSalesDemoSettings(): SalesDemoSettings {
  return { ...DEFAULT_DEMO_SETTINGS, websiteSources: [], importedFaqCandidates: [], importedClinicInfoCandidate: {}, importedSourcePages: [], faqs: createSampleSalesDemoFaqs() };
}
