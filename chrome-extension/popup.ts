declare const chrome: any;
export {};

const STORAGE_KEY = "tsunamaruChromeDemoConfig";
const textarea = document.querySelector<HTMLTextAreaElement>("#config")!;
const statusElement = document.querySelector<HTMLParagraphElement>("#status")!;
const loaded = document.querySelector<HTMLParagraphElement>("#loaded")!;

type StoredConfig = {
  version: 1;
  dealId: string;
  clinicInfo: Record<string, string>;
  appearance: { mainColor: string; logoUrl: string };
  faqs: Array<Record<string, unknown>>;
};

void chrome.storage.local.get(STORAGE_KEY).then((result: Record<string, unknown>) => {
  const config = validateConfig(result[STORAGE_KEY]);
  if (config) {
    textarea.value = JSON.stringify(config, null, 2);
    showLoaded(config);
  }
});

document.querySelector("#load")!.addEventListener("click", async () => {
  try {
    const config = validateConfig(JSON.parse(textarea.value));
    if (!config) throw new Error("設定JSONの形式が正しくありません。");
    await chrome.storage.local.set({ [STORAGE_KEY]: config });
    textarea.value = JSON.stringify(config, null, 2);
    showLoaded(config);
    setStatus("商談デモ設定を保存しました。", false);
  } catch (cause) {
    setStatus(cause instanceof Error ? cause.message : "設定JSONを読み込めませんでした。", true);
  }
});

document.querySelector("#show")!.addEventListener("click", async () => {
  try {
    const configResult = await chrome.storage.local.get(STORAGE_KEY);
    if (!validateConfig(configResult[STORAGE_KEY])) throw new Error("先に商談デモ設定JSONを読み込んでください。");
    const tab = await getSupportedActiveTab();
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["dist/content.js"] });
    setStatus("このページにつなまるAIを表示しました。", false);
  } catch (cause) {
    setStatus(readChromeError(cause), true);
  }
});

document.querySelector("#hide")!.addEventListener("click", async () => {
  try {
    const tab = await getSupportedActiveTab();
    await chrome.tabs.sendMessage(tab.id, { type: "TSUNAMARU_HIDE" });
    setStatus("つなまるAIを非表示にしました。", false);
  } catch {
    setStatus("このページには、つなまるAIが表示されていません。", true);
  }
});

document.querySelector("#delete")!.addEventListener("click", async () => {
  await chrome.storage.local.remove(STORAGE_KEY);
  textarea.value = "";
  loaded.hidden = true;
  setStatus("登録設定を削除しました。", false);
});

async function getSupportedActiveTab(): Promise<{ id: number; url: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || typeof tab.id !== "number" || typeof tab.url !== "string") throw new Error("現在のタブを確認できませんでした。");
  let url: URL;
  try { url = new URL(tab.url); } catch { throw new Error("このページでは実行できません。"); }
  const webStore = url.hostname === "chromewebstore.google.com" || (url.hostname === "chrome.google.com" && url.pathname.startsWith("/webstore"));
  const pdf = url.pathname.toLowerCase().endsWith(".pdf") || url.protocol === "chrome-extension:";
  if (!['http:', 'https:'].includes(url.protocol) || webStore || pdf) {
    throw new Error("http/httpsの通常ページでのみ表示できます。Chrome内部ページ・ウェブストア・PDFでは実行できません。");
  }
  return { id: tab.id, url: tab.url };
}

function validateConfig(value: unknown): StoredConfig | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.dealId !== "string" || value.dealId.length > 100) return null;
  if (!isRecord(value.clinicInfo) || !isRecord(value.appearance) || !Array.isArray(value.faqs) || value.faqs.length > 100) return null;
  const requiredClinicKeys = ["clinicName", "doctorName", "departments", "phone", "postalCode", "address", "openingHours", "closedDays", "access", "parking", "reservationUrl", "websiteUrl"];
  const clinicInfo: Record<string, string> = {};
  for (const key of requiredClinicKeys) {
    const item = value.clinicInfo[key];
    if (typeof item !== "string" || item.length > 2000) return null;
    clinicInfo[key] = item;
  }
  if (typeof value.appearance.mainColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.appearance.mainColor)) return null;
  if (typeof value.appearance.logoUrl !== "string" || value.appearance.logoUrl.length > 500 || /^\s*(data|javascript):/i.test(value.appearance.logoUrl)) return null;
  const faqs = value.faqs.flatMap((faq) => validateFaq(faq));
  if (faqs.length !== value.faqs.length) return null;
  return { version: 1, dealId: value.dealId, clinicInfo, appearance: { mainColor: value.appearance.mainColor, logoUrl: value.appearance.logoUrl }, faqs };
}

function validateFaq(value: unknown): Array<Record<string, unknown>> {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.category !== "string" || typeof value.question !== "string" || typeof value.answer !== "string") return [];
  if (value.question.length > 300 || value.answer.length > 5000 || !Array.isArray(value.keywords) || value.keywords.some((item) => typeof item !== "string" || item.length > 100)) return [];
  if (!['none', 'phone', 'reservation', 'link'].includes(String(value.actionType))) return [];
  return [{ id: value.id, category: value.category, question: value.question, answer: value.answer, keywords: value.keywords, actionType: value.actionType, actionLabel: typeof value.actionLabel === "string" ? value.actionLabel : undefined, actionUrl: typeof value.actionUrl === "string" ? value.actionUrl : undefined, sortOrder: typeof value.sortOrder === "number" ? value.sortOrder : 0 }];
}

function showLoaded(config: StoredConfig) {
  loaded.hidden = false;
  loaded.textContent = `${config.clinicInfo.clinicName || "名称未設定"}・公開FAQ ${config.faqs.length}件を登録済み`;
}

function setStatus(message: string, error: boolean) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", error);
}

function readChromeError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/Cannot access|The extensions gallery cannot be scripted|Missing host permission/i.test(message)) {
    return "このページでは実行できません。通常のhttp/httpsページを開いてください。";
  }
  return message || "つなまるAIを表示できませんでした。";
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
