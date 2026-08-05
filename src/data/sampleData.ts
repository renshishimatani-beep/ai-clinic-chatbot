import type { ClinicInfo, ChatSettings, FAQ } from "@/types";

export const SAMPLE_CLINIC_INFO: ClinicInfo = {
  clinicName: "みなと海浜クリニック（サンプル）",
  doctorName: "田中 葵 先生",
  departments: "内科・小児科",
  postalCode: "000-0000",
  address: "〒000-0000 サンプル市港区海岸通1-2-3",
  phone: "000-000-0000",
  openingHours: "月〜金 9:00〜12:30 / 15:00〜18:00、土 9:00〜12:00",
  receptionHours: "",
  closedDays: "日曜日・祝日",
  access: "サンプル駅北口から徒歩3分です。",
  parking: "クリニック裏に無料駐車場5台分があります。",
  reservationUrl: "https://example.com/reserve",
  websiteUrl: "https://example.com",
  firstVisitRequirements:
    "初診の方は保険証をお持ちください。紹介状があればご持参ください。受付に10分前にお越しいただき、問診票にご記入をお願いします。",
  paymentMethods: "現金・クレジットカード・ICカード・QRコード決済に対応しています。",
  medicalServices: "",
  examinations: "",
  healthCheckups: "",
  vaccinations: "",
  feverInstructions:
    "発熱がある場合は、来院前に必ずお電話ください。マスクをご着用いただき、公共交通機関の利用はお控えください。建物東側の発熱者专用入口をご利用ください。",
};

export const DEFAULT_SETTINGS: ChatSettings = {
  mainColor: "#3BA9D4",
  welcomeMessage:
    "こんにちは！つなまるAIです。\n\n診療時間や予約方法、アクセス、初診時の持ち物などをご案内します。\n\n知りたい内容を選ぶか、下の入力欄から質問してください。",
  disclaimer:
    "つなまるAIは、診断・治療・薬に関する個別の判断を行いません。",
  fallbackMessage:
    "申し訳ありません、ご質問に該当する情報が見つかりませんでした。\n\n個別のご相談や診療に関するご質問は、クリニックまで直接お問い合わせください。",
  showPhoneButton: true,
  showReservationButton: true,
  showCharacter: true,
};

export const SAMPLE_FAQS: FAQ[] = [
  {
    id: "faq-hours",
    category: "診療時間",
    question: "診療時間を教えてください",
    answer:
      "診療時間は{{openingHours}}です。\n休診日は{{closedDays}}です。",
    keywords: ["hours", "open", "opening", "close", "time", "when", "clinic hours", "営業", "診療時間", "時間", "受付"],
    actionType: "none",
    isPublished: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "faq-reservation",
    category: "予約",
    question: "予約の方法を教えてください",
    answer:
      "Web予約ページからオンラインでご予約いただけます。また、診療時間内に{{clinicName}}へお電話いただいてもご予約可能です。",
    keywords: ["reservation", "appointment", "book", "booking", "reserve", "予約", "受付", "予約方法"],
    actionType: "reservation",
    actionLabel: "Web予約",
    isPublished: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "faq-first-visit",
    category: "初診",
    question: "初診時の持ち物を教えてください",
    answer: "{{firstVisitRequirements}}",
    keywords: ["first visit", "first time", "bring", "insurance card", "referral", "初診", "初めて", "持ち物", "保険証"],
    actionType: "none",
    isPublished: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "faq-access",
    category: "アクセス",
    question: "クリニックへのアクセスを教えてください",
    answer: "住所は{{address}}です。\n{{access}}",
    keywords: ["access", "directions", "how to get", "location", "station", "アクセス", "行き方", "地図"],
    actionType: "link",
    actionLabel: "地図を見る",
    actionUrl: "https://example.com/map",
    isPublished: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "faq-parking",
    category: "駐車場",
    question: "駐車場はありますか",
    answer: "{{parking}}",
    keywords: ["parking", "car", "park", "駐車場", "車", "無料"],
    actionType: "none",
    isPublished: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "faq-fever",
    category: "発熱",
    question: "発熱がある場合はどうすればいいですか",
    answer: "{{feverInstructions}}",
    keywords: ["fever", "temperature", "hot", "flu", "発熱", "熱", "風邪"],
    actionType: "phone",
    actionLabel: "クリニックに電話する",
    isPublished: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "faq-payment",
    category: "支払い",
    question: "支払い方法を教えてください",
    answer: "{{paymentMethods}}",
    keywords: ["payment", "pay", "credit card", "cash", "insurance", "支払い", "カード", "現金"],
    actionType: "none",
    isPublished: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "faq-services",
    category: "診療内容",
    question: "診療内容を教えてください",
    answer:
      "{{departments}}の一般診療のほか、健康診断・予防接種・経過観察を行っています。専門的な治療が必要な場合は、連携病院をご紹介いたします。",
    keywords: ["services", "departments", "checkup", "vaccination", "consultation", "診療", "サービス", "内容", "内科", "小児科"],
    actionType: "none",
    isPublished: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];
