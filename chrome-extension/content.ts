import contentStyles from "./content.css?inline";

declare const chrome: any;

type DemoFaq = {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  actionType: "none" | "phone" | "reservation" | "link";
  actionLabel?: string;
  actionUrl?: string;
  sortOrder: number;
};

type DemoConfig = {
  version: 1;
  dealId: string;
  clinicInfo: Record<string, string>;
  appearance: { mainColor: string; logoUrl: string };
  faqs: DemoFaq[];
};

type DemoController = { refresh: () => Promise<void>; destroy: () => void };
const STORAGE_KEY = "tsunamaruChromeDemoConfig";
const HOST_ID = "tsunamaru-sales-demo-root";
const CONTROLLER_KEY = "__tsunamaruSalesDemoController";
const FALLBACK = "こちらの内容は、現在登録されている医院情報からは確認できませんでした。詳しくはクリニックへお問い合わせください。";
const MEDICAL_RESPONSE = "つなまるAIは、症状の診断や個別の治療・服薬に関するご案内を行うことはできません。診療時間内にクリニックまでお問い合わせください。";
const EMERGENCY_RESPONSE = "緊急の医療対応が必要な可能性があります。呼吸困難・意識消失・胸の激痛・大量の出血がある場合は、ただちに救急サービス（119番）へご連絡ください。";

const globalScope = globalThis as typeof globalThis & { [CONTROLLER_KEY]?: DemoController };
if (globalScope[CONTROLLER_KEY]) {
  void globalScope[CONTROLLER_KEY]!.refresh();
} else {
  let host: HTMLDivElement | null = null;

  const destroy = () => {
    host?.remove();
    host = null;
    chrome.runtime.onMessage.removeListener(onMessage);
    delete globalScope[CONTROLLER_KEY];
  };

  const refresh = async () => {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const config = validateConfig(stored[STORAGE_KEY]);
    if (config) mount(config);
  };

  const onMessage = (message: unknown) => {
    if (isRecord(message) && message.type === "TSUNAMARU_HIDE") destroy();
  };

  const controller: DemoController = { refresh, destroy };
  globalScope[CONTROLLER_KEY] = controller;
  chrome.runtime.onMessage.addListener(onMessage);
  void refresh();

  function mount(config: DemoConfig) {
    host?.remove();
    host = document.createElement("div");
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = contentStyles;
    shadow.append(style);

    const shell = document.createElement("div");
    shell.className = "ts-shell";
    shell.innerHTML = `
      <button class="ts-launcher" type="button" aria-label="つなまるAIに質問する">
        <span class="ts-bubble">詳しくは僕が答えるよ！<span class="ts-bubble-tail" aria-hidden="true"></span></span>
        <img class="ts-launcher-character" alt="" draggable="false" />
      </button>
      <section class="ts-chat" role="dialog" aria-label="つなまるAIチャット" aria-hidden="true">
        <header class="ts-header">
          <div class="ts-header-brand"><img class="ts-header-image" alt="" /><div><h2>つなまるAI</h2><p class="ts-clinic-name"></p></div></div>
          <button class="ts-close" type="button" aria-label="チャットを閉じる">×</button>
        </header>
        <div class="ts-notice">氏名、電話番号、診察券番号、具体的な症状、検査結果などの個人情報は入力しないでください。</div>
        <div class="ts-messages" aria-live="polite"></div>
        <div class="ts-quick" aria-label="よくある質問"></div>
        <div class="ts-contact"></div>
        <form class="ts-input-row"><textarea class="ts-input" rows="1" aria-label="質問を入力" placeholder="質問を入力してください"></textarea><button class="ts-send" type="submit">送信</button></form>
      </section>`;
    shadow.append(shell);
    document.documentElement.append(host);

    const mainColor = /^#[0-9a-fA-F]{6}$/.test(config.appearance.mainColor) ? config.appearance.mainColor : "#3BA9D4";
    shell.style.setProperty("--ts-main", mainColor);
    const characterUrl = chrome.runtime.getURL("assets/tsunamaru-transparent.png");
    const launcherImage = shell.querySelector<HTMLImageElement>(".ts-launcher-character")!;
    const headerImage = shell.querySelector<HTMLImageElement>(".ts-header-image")!;
    launcherImage.src = characterUrl;
    headerImage.src = safeImageUrl(config.appearance.logoUrl) || characterUrl;
    headerImage.alt = config.appearance.logoUrl ? `${config.clinicInfo.clinicName}のロゴ` : "";
    shell.querySelector<HTMLElement>(".ts-clinic-name")!.textContent = config.clinicInfo.clinicName;

    const launcher = shell.querySelector<HTMLButtonElement>(".ts-launcher")!;
    const chat = shell.querySelector<HTMLElement>(".ts-chat")!;
    const close = shell.querySelector<HTMLButtonElement>(".ts-close")!;
    const form = shell.querySelector<HTMLFormElement>(".ts-input-row")!;
    const input = shell.querySelector<HTMLTextAreaElement>(".ts-input")!;
    const messages = shell.querySelector<HTMLElement>(".ts-messages")!;
    const quick = shell.querySelector<HTMLElement>(".ts-quick")!;
    const contact = shell.querySelector<HTMLElement>(".ts-contact")!;

    const openChat = () => {
      shell.classList.add("ts-open");
      chat.setAttribute("aria-hidden", "false");
      window.setTimeout(() => input.focus(), 220);
    };
    const closeChat = () => {
      shell.classList.remove("ts-open");
      chat.setAttribute("aria-hidden", "true");
      window.setTimeout(() => launcher.focus(), 220);
    };
    launcher.addEventListener("click", openChat);
    close.addEventListener("click", closeChat);
    chat.addEventListener("keydown", (event) => { if (event.key === "Escape") closeChat(); });

    appendMessage(messages, "bot", `${config.clinicInfo.clinicName || "クリニック"}のご案内をお手伝いします。知りたいことを入力してください。`);
    ["診療時間", "アクセス", "Web予約", "電話で問い合わせたい"].forEach((question) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = question;
      button.addEventListener("click", () => answer(question));
      quick.append(button);
    });
    addContactLink(contact, "電話する", `tel:${config.clinicInfo.phone}`);
    addContactLink(contact, "Web予約", config.clinicInfo.reservationUrl);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question) return;
      input.value = "";
      answer(question);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    function answer(question: string) {
      appendMessage(messages, "user", question);
      const safety = checkSafety(question);
      if (safety === "emergency") {
        appendMessage(messages, "bot", EMERGENCY_RESPONSE);
        return;
      }
      if (safety === "medical") {
        appendMessage(messages, "bot", MEDICAL_RESPONSE);
        return;
      }
      if (question === "電話で問い合わせたい") {
        appendMessage(messages, "bot", fillPlaceholders("{{clinicName}}へは、{{phone}}までお電話ください。", config.clinicInfo), { label: "今すぐ電話する", url: `tel:${config.clinicInfo.phone}` });
        return;
      }
      const faq = matchFaq(question, config.faqs);
      if (!faq) {
        appendMessage(messages, "bot", FALLBACK);
        return;
      }
      const action = buildAction(faq, config.clinicInfo);
      appendMessage(messages, "bot", fillPlaceholders(faq.answer, config.clinicInfo), action);
    }
  }
}

function appendMessage(container: HTMLElement, role: "user" | "bot", text: string, action?: { label: string; url: string } | null) {
  const row = document.createElement("div");
  row.className = `ts-message-row ts-${role}`;
  const bubble = document.createElement("div");
  bubble.className = "ts-message";
  bubble.textContent = text;
  if (action && safeActionUrl(action.url)) {
    const link = document.createElement("a");
    link.textContent = action.label;
    link.href = action.url;
    if (/^https?:/i.test(action.url)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    bubble.append(link);
  }
  row.append(bubble);
  container.append(row);
  container.scrollTop = container.scrollHeight;
}

function addContactLink(container: HTMLElement, label: string, url: string) {
  if (!safeActionUrl(url)) return;
  const link = document.createElement("a");
  link.textContent = label;
  link.href = url;
  if (/^https?:/i.test(url)) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
  container.append(link);
}

function buildAction(faq: DemoFaq, clinic: Record<string, string>): { label: string; url: string } | null {
  if (faq.actionType === "phone") return { label: faq.actionLabel || "クリニックに電話する", url: `tel:${clinic.phone}` };
  if (faq.actionType === "reservation") return { label: faq.actionLabel || "Web予約", url: clinic.reservationUrl };
  if (faq.actionType === "link") return { label: faq.actionLabel || "公式サイトで確認する", url: faq.actionUrl || clinic.websiteUrl };
  return null;
}

function matchFaq(input: string, faqs: DemoFaq[]): DemoFaq | null {
  const normalized = normalize(input);
  for (const faq of faqs) if (normalize(faq.question) === normalized) return faq;
  let best: DemoFaq | null = null;
  let bestHits = 0;
  for (const faq of faqs) {
    const hits = faq.keywords.filter((keyword) => normalize(keyword) && normalized.includes(normalize(keyword))).length;
    if (hits > bestHits) { best = faq; bestHits = hits; }
  }
  if (best) return best;
  for (const faq of faqs) {
    const question = normalize(faq.question);
    if (question.length > 3 && (normalized.includes(question) || question.includes(normalized))) return faq;
  }
  return null;
}

function checkSafety(input: string): "emergency" | "medical" | null {
  const value = normalize(input);
  const emergency = ["救急", "意識がない", "呼吸できない", "救急車", "息ができない", "胸の激痛", "大量の出血"];
  const medical = ["診断", "病名", "薬", "服薬", "検査結果", "治療", "投薬", "処方", "病気"];
  if (emergency.some((phrase) => value.includes(normalize(phrase)))) return "emergency";
  if (medical.some((phrase) => value.includes(normalize(phrase)))) return "medical";
  return null;
}

function fillPlaceholders(text: string, clinic: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => Object.prototype.hasOwnProperty.call(clinic, key) ? clinic[key] || "詳しくはクリニックへお問い合わせください。" : match);
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\u3000、。,.!?！？・「」『』（）()\-ー]/g, "");
}

function safeActionUrl(value: string): boolean {
  if (/^tel:[+\d][+\d().\-\s]{0,29}$/i.test(value)) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

function safeImageUrl(value: string): string {
  if (!value) return "";
  try { return ["http:", "https:"].includes(new URL(value).protocol) ? value : ""; } catch { return ""; }
}

function validateConfig(value: unknown): DemoConfig | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.dealId !== "string" || !isRecord(value.clinicInfo) || !isRecord(value.appearance) || !Array.isArray(value.faqs)) return null;
  const clinicInfo: Record<string, string> = {};
  for (const key of ["clinicName", "doctorName", "departments", "phone", "postalCode", "address", "openingHours", "closedDays", "access", "parking", "reservationUrl", "websiteUrl"]) {
    if (typeof value.clinicInfo[key] !== "string") return null;
    clinicInfo[key] = value.clinicInfo[key];
  }
  if (typeof value.appearance.mainColor !== "string" || typeof value.appearance.logoUrl !== "string") return null;
  const faqs = value.faqs.filter((faq): faq is DemoFaq => isRecord(faq) && typeof faq.question === "string" && typeof faq.answer === "string" && Array.isArray(faq.keywords));
  if (faqs.length !== value.faqs.length) return null;
  return { version: 1, dealId: value.dealId, clinicInfo, appearance: { mainColor: value.appearance.mainColor, logoUrl: value.appearance.logoUrl }, faqs };
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
