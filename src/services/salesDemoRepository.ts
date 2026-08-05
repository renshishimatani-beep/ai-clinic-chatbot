import type { FAQ, ImportedClinicInfo, ImportedFAQ, ImportedSourcePage, SalesDemoDeal, SalesDemoFAQ, SalesDemoSettings, SalesDemoStatus, SalesDemoWebsiteSource } from "@/types";
import { uid } from "@/services/storage";
import { migrateSalesDemoSettings, SALES_DEMO_DATA_VERSION } from "@/services/salesDemoStorage";

const DEALS_KEY = "tsunamaru_sales_demo_deals";
const ACTIVE_KEY = "tsunamaru_active_sales_demo_id";
const VERSION_KEY = "tsunamaru_sales_demo_deals_version";
const LEGACY_KEY = "tsunamaru_sales_demo_settings";
export const SALES_DEMO_DEALS_VERSION = 6;

const STATUSES: SalesDemoStatus[] = ["draft", "scheduled", "presented", "won", "lost", "archived"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneFaqs(faqs: SalesDemoFAQ[], renewIds = false): SalesDemoFAQ[] {
  return faqs.map((faq, index) => ({
    ...faq,
    id: renewIds ? uid() : faq.id,
    keywords: [...faq.keywords],
    sortOrder: index + 1,
  }));
}

function cloneWebsiteSources(sources: SalesDemoWebsiteSource[], renewIds = false): SalesDemoWebsiteSource[] {
  return sources.map((source) => ({ ...source, id: renewIds ? uid() : source.id }));
}

function cloneCandidates(candidates: ImportedFAQ[], renewIds = false): ImportedFAQ[] {
  return candidates.map((candidate) => ({
    ...candidate,
    id: renewIds ? uid() : candidate.id,
    keywords: [...candidate.keywords],
  }));
}

function cloneClinicCandidate(candidate: ImportedClinicInfo): ImportedClinicInfo { return { ...candidate }; }
function cloneSourcePages(pages: ImportedSourcePage[]): ImportedSourcePage[] { return pages.map((page) => ({ ...page })); }

function readDealsRaw(): SalesDemoDeal[] {
  try {
    const raw = localStorage.getItem(DEALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => normalizeDeal(item));
  } catch {
    return [];
  }
}

function writeDeals(deals: SalesDemoDeal[]): boolean {
  try {
    localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
    localStorage.setItem(VERSION_KEY, String(SALES_DEMO_DEALS_VERSION));
    return true;
  } catch {
    return false;
  }
}

function normalizeDeal(value: unknown): SalesDemoDeal[] {
  if (!isRecord(value)) return [];
  const settings = migrateSalesDemoSettings({ ...value, dataVersion: SALES_DEMO_DATA_VERSION, salesMemo: value.internalMemo });
  const now = new Date().toISOString();
  return [{
    id: typeof value.id === "string" && value.id ? value.id : uid(),
    dealName: typeof value.dealName === "string" && value.dealName ? value.dealName : `${settings.clinicName || "名称未設定"} 商談デモ`,
    ...settingsToDealFields(settings),
    internalMemo: typeof value.internalMemo === "string" ? value.internalMemo : settings.salesMemo,
    faqs: cloneFaqs(settings.faqs),
    status: STATUSES.includes(value.status as SalesDemoStatus) ? value.status as SalesDemoStatus : "draft",
    scheduledAt: typeof value.scheduledAt === "string" && value.scheduledAt ? value.scheduledAt : undefined,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
    lastOpenedAt: typeof value.lastOpenedAt === "string" ? value.lastOpenedAt : undefined,
  }];
}

function migrateLegacyOnce(): void {
  if (localStorage.getItem(VERSION_KEY) === String(SALES_DEMO_DEALS_VERSION)) return;
  const current = readDealsRaw();
  if (current.length > 0) {
    // v2: 廃止した archived は削除せず、通常の下書き商談として扱う。
    writeDeals(current.map((deal) => ({
      ...deal,
      status: deal.status === "archived" ? "draft" : deal.status,
      // v5の導線が自動でscreenshotへ変更していた既存商談はiframe優先へ戻す。
      prospectPreviewMode: deal.prospectPreviewMode === "screenshot" ? "auto" : deal.prospectPreviewMode,
    })));
  } else {
    try {
      const legacyRaw = localStorage.getItem(LEGACY_KEY);
      if (legacyRaw) {
        const legacy = migrateSalesDemoSettings(JSON.parse(legacyRaw));
        const migrated = createDealRecord({
          ...settingsToDealFields(legacy),
          dealName: legacy.clinicName ? `${legacy.clinicName} 商談デモ` : "既存の商談デモ",
          internalMemo: legacy.salesMemo,
          faqs: cloneFaqs(legacy.faqs),
        });
        writeDeals([migrated]);
        localStorage.setItem(ACTIVE_KEY, migrated.id);
      }
    } catch {
      // 壊れた旧データは残したまま、新形式の初期化だけ行う。
    }
  }
  localStorage.setItem(VERSION_KEY, String(SALES_DEMO_DEALS_VERSION));
}

function createDealRecord(data: Partial<SalesDemoDeal> = {}): SalesDemoDeal {
  const now = new Date().toISOString();
  return {
    id: uid(),
    dealName: data.dealName || "新しい商談デモ",
    clinicName: data.clinicName || "",
    doctorName: data.doctorName || "",
    departments: data.departments || "",
    phone: data.phone || "",
    postalCode: data.postalCode || "",
    address: data.address || "",
    openingHours: data.openingHours || "",
    receptionHours: data.receptionHours || "",
    closedDays: data.closedDays || "",
    access: data.access || "",
    parking: data.parking || "",
    paymentMethods: data.paymentMethods || "",
    medicalServices: data.medicalServices || "",
    examinations: data.examinations || "",
    healthCheckups: data.healthCheckups || "",
    vaccinations: data.vaccinations || "",
    feverInstructions: data.feverInstructions || "",
    firstVisitItems: data.firstVisitItems || "",
    reservationUrl: data.reservationUrl || "",
    websiteUrl: data.websiteUrl || "",
    mainColor: data.mainColor || "#3BA9D4",
    logoUrl: data.logoUrl || "",
    prospectWebsiteUrl: data.prospectWebsiteUrl || "",
    prospectWebsiteName: data.prospectWebsiteName || "",
    prospectWebsiteScreenshotUrl: data.prospectWebsiteScreenshotUrl || "",
    prospectWebsiteScreenshotStorageKey: data.prospectWebsiteScreenshotStorageKey || "",
    prospectPreviewMode: data.prospectPreviewMode || "auto",
    websiteSources: cloneWebsiteSources(data.websiteSources || []),
    generatedFaqPrompt: data.generatedFaqPrompt || "",
    lastImportedAiResponse: data.lastImportedAiResponse || "",
    importedFaqCandidates: cloneCandidates(data.importedFaqCandidates || []),
    importedClinicInfoCandidate: cloneClinicCandidate(data.importedClinicInfoCandidate || {}),
    importedSourcePages: cloneSourcePages(data.importedSourcePages || []),
    internalMemo: data.internalMemo || "",
    faqs: cloneFaqs(data.faqs || []),
    status: data.status || "draft",
    scheduledAt: data.scheduledAt,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
}

export function getSalesDemoDeals(): SalesDemoDeal[] {
  migrateLegacyOnce();
  return readDealsRaw();
}

export function getSalesDemoDeal(id: string): SalesDemoDeal | null {
  return getSalesDemoDeals().find((deal) => deal.id === id) ?? null;
}

export function createSalesDemoDeal(data: Partial<SalesDemoDeal> = {}): SalesDemoDeal {
  const deal = createDealRecord(data);
  const deals = getSalesDemoDeals();
  if (!writeDeals([...deals, deal])) throw new Error("商談デモの保存に失敗しました。");
  localStorage.setItem(ACTIVE_KEY, deal.id);
  return deal;
}

export function updateSalesDemoDeal(id: string, data: Partial<SalesDemoDeal>): SalesDemoDeal | null {
  const deals = getSalesDemoDeals();
  const current = deals.find((deal) => deal.id === id);
  if (!current) return null;
  const now = new Date().toISOString();
  const updated = normalizeDeal({
    ...current,
    ...data,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: now,
    lastOpenedAt: now,
  })[0];
  if (!writeDeals(deals.map((deal) => deal.id === id ? updated : deal))) {
    throw new Error("商談デモの保存に失敗しました。");
  }
  return updated;
}

export function duplicateSalesDemoDeal(id: string): SalesDemoDeal | null {
  const source = getSalesDemoDeal(id);
  if (!source) return null;
  return createSalesDemoDeal({
    ...source,
    id: undefined,
    dealName: `${source.dealName} のコピー`,
    status: "draft",
    scheduledAt: undefined,
    faqs: cloneFaqs(source.faqs, true),
    websiteSources: cloneWebsiteSources(source.websiteSources, true),
    importedFaqCandidates: [],
    lastImportedAiResponse: "",
    importedClinicInfoCandidate: {},
    importedSourcePages: [],
    prospectWebsiteScreenshotStorageKey: "",
    createdAt: undefined,
    updatedAt: undefined,
    lastOpenedAt: undefined,
  });
}

export function deleteSalesDemoDeal(id: string): boolean {
  const deals = getSalesDemoDeals();
  const next = deals.filter((deal) => deal.id !== id);
  if (next.length === deals.length) return false;
  const saved = writeDeals(next);
  if (saved && localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
  return saved;
}

export function setActiveSalesDemoDeal(id: string): SalesDemoDeal | null {
  const deals = getSalesDemoDeals();
  const current = deals.find((deal) => deal.id === id);
  if (!current) return null;
  const opened = { ...current, lastOpenedAt: new Date().toISOString() };
  if (!writeDeals(deals.map((deal) => deal.id === id ? opened : deal))) return null;
  localStorage.setItem(ACTIVE_KEY, id);
  return opened;
}

export function getActiveSalesDemoDeal(): SalesDemoDeal | null {
  const id = localStorage.getItem(ACTIVE_KEY);
  return id ? getSalesDemoDeal(id) : null;
}

export function salesDemoDealToSettings(deal: SalesDemoDeal): SalesDemoSettings {
  return {
    dataVersion: SALES_DEMO_DATA_VERSION,
    ...settingsToDealFields(deal),
    faqs: cloneFaqs(deal.faqs),
    websiteSources: cloneWebsiteSources(deal.websiteSources),
    generatedFaqPrompt: deal.generatedFaqPrompt,
    lastImportedAiResponse: deal.lastImportedAiResponse,
    importedFaqCandidates: cloneCandidates(deal.importedFaqCandidates),
    importedClinicInfoCandidate: cloneClinicCandidate(deal.importedClinicInfoCandidate),
    importedSourcePages: cloneSourcePages(deal.importedSourcePages),
    salesMemo: deal.internalMemo,
  };
}

export function salesDemoSettingsToDealFields(settings: SalesDemoSettings): Partial<SalesDemoDeal> {
  return {
    ...settingsToDealFields(settings),
    faqs: cloneFaqs(settings.faqs),
    websiteSources: cloneWebsiteSources(settings.websiteSources),
    generatedFaqPrompt: settings.generatedFaqPrompt,
    lastImportedAiResponse: settings.lastImportedAiResponse,
    importedFaqCandidates: cloneCandidates(settings.importedFaqCandidates),
    importedClinicInfoCandidate: cloneClinicCandidate(settings.importedClinicInfoCandidate),
    importedSourcePages: cloneSourcePages(settings.importedSourcePages),
    internalMemo: settings.salesMemo,
  };
}

function settingsToDealFields(settings: SalesDemoSettings | SalesDemoDeal) {
  return {
    clinicName: settings.clinicName,
    doctorName: settings.doctorName,
    departments: settings.departments,
    phone: settings.phone,
    postalCode: settings.postalCode,
    address: settings.address,
    openingHours: settings.openingHours,
    receptionHours: settings.receptionHours,
    closedDays: settings.closedDays,
    access: settings.access,
    parking: settings.parking,
    paymentMethods: settings.paymentMethods,
    medicalServices: settings.medicalServices,
    examinations: settings.examinations,
    healthCheckups: settings.healthCheckups,
    vaccinations: settings.vaccinations,
    feverInstructions: settings.feverInstructions,
    firstVisitItems: settings.firstVisitItems,
    reservationUrl: settings.reservationUrl,
    websiteUrl: settings.websiteUrl,
    mainColor: settings.mainColor,
    logoUrl: settings.logoUrl,
    prospectWebsiteUrl: settings.prospectWebsiteUrl,
    prospectWebsiteName: settings.prospectWebsiteName,
    prospectWebsiteScreenshotUrl: settings.prospectWebsiteScreenshotUrl,
    prospectWebsiteScreenshotStorageKey: settings.prospectWebsiteScreenshotStorageKey,
    prospectPreviewMode: settings.prospectPreviewMode,
    websiteSources: cloneWebsiteSources(settings.websiteSources),
    generatedFaqPrompt: settings.generatedFaqPrompt,
    lastImportedAiResponse: settings.lastImportedAiResponse,
    importedFaqCandidates: cloneCandidates(settings.importedFaqCandidates),
    importedClinicInfoCandidate: cloneClinicCandidate(settings.importedClinicInfoCandidate),
    importedSourcePages: cloneSourcePages(settings.importedSourcePages),
  };
}

export function normalFaqsToSalesFaqs(faqs: FAQ[]): SalesDemoFAQ[] {
  return faqs.map((faq, index) => ({
    ...faq,
    id: uid(),
    keywords: [...faq.keywords],
    sortOrder: index + 1,
    updatedAt: new Date().toISOString(),
  }));
}
