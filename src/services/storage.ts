import type {
  FAQ,
  ClinicInfo,
  ChatSettings,
  ChatMessage,
  UnansweredQuestion,
} from "@/types";
import { SAMPLE_FAQS, SAMPLE_CLINIC_INFO, DEFAULT_SETTINGS } from "@/data/sampleData";

const KEYS = {
  faqs: "tsunamaru.faqs",
  clinic: "tsunamaru.clinicInfo",
  settings: "tsunamaru.settings",
  history: "tsunamaru.history",
  unanswered: "tsunamaru.unanswered",
  version: "tsunamaru.dataVersion",
} as const;

const DATA_VERSION = "ja-v2";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export const storage = {
  getFAQs(): FAQ[] {
    return read<FAQ[]>(KEYS.faqs, SAMPLE_FAQS);
  },
  setFAQs(faqs: FAQ[]): void {
    write(KEYS.faqs, faqs);
  },

  getClinicInfo(): ClinicInfo {
    return read<ClinicInfo>(KEYS.clinic, SAMPLE_CLINIC_INFO);
  },
  setClinicInfo(info: ClinicInfo): void {
    write(KEYS.clinic, info);
  },

  getSettings(): ChatSettings {
    return read<ChatSettings>(KEYS.settings, DEFAULT_SETTINGS);
  },
  setSettings(settings: ChatSettings): void {
    write(KEYS.settings, settings);
  },

  getHistory(): ChatMessage[] {
    return read<ChatMessage[]>(KEYS.history, []);
  },
  setHistory(history: ChatMessage[]): void {
    write(KEYS.history, history);
  },

  getUnanswered(): UnansweredQuestion[] {
    return read<UnansweredQuestion[]>(KEYS.unanswered, []);
  },
  setUnanswered(items: UnansweredQuestion[]): void {
    write(KEYS.unanswered, items);
  },

  resetToSampleData(): void {
    write(KEYS.faqs, SAMPLE_FAQS);
    write(KEYS.clinic, SAMPLE_CLINIC_INFO);
    write(KEYS.settings, DEFAULT_SETTINGS);
    write(KEYS.history, []);
    write(KEYS.unanswered, []);
    write(KEYS.version, DATA_VERSION);
  },

  migrateIfNeeded(): void {
    const current = read<string | null>(KEYS.version, null);
    if (current === DATA_VERSION) return;
    // Clear chat messages and conversation history
    write(KEYS.history, []);
    write(KEYS.unanswered, []);
    // Reload latest Japanese sample FAQs and settings
    write(KEYS.faqs, SAMPLE_FAQS);
    write(KEYS.settings, DEFAULT_SETTINGS);
    // Keep user-entered clinic info untouched
    write(KEYS.version, DATA_VERSION);
  },
};

export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
