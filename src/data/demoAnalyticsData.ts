export type DemoInquiry = {
  id: string;
  receivedAt: string;
  question: string;
  category: string;
  keyword: string;
  matchedFaq?: string;
  answered: boolean;
  timeType: "診療時間内" | "診療開始前" | "昼休診" | "診療終了後" | "休診日";
  source: "公式サイト" | "LINE" | "埋め込みウィジェット";
  action: "なし" | "Web予約" | "電話" | "アクセス確認";
};

export const DEMO_CATEGORIES = [
  "診療時間",
  "予約",
  "診療内容",
  "発熱",
  "初診",
  "アクセス",
  "駐車場",
  "支払い",
  "健康診断",
  "予防接種",
  "内視鏡検査",
  "薬・処方",
  "その他",
] as const;

const QUESTIONS: { q: string; cat: string; kw: string; faq?: string }[] = [
  { q: "今日の午後は診療していますか", cat: "診療時間", kw: "午後 診療", faq: "今日の午後は診療していますか" },
  { q: "土曜日は何時までですか", cat: "診療時間", kw: "土曜 終了", faq: "土曜日は何時までですか" },
  { q: "日曜日は休診ですか", cat: "診療時間", kw: "日曜 休診", faq: "日曜日は休診ですか" },
  { q: "年末年始は休診ですか", cat: "診療時間", kw: "年末年始 休診", faq: "年末年始は休診ですか" },
  { q: "初診でもWeb予約できますか", cat: "予約", kw: "初診 Web予約", faq: "初診でもWeb予約できますか" },
  { q: "予約を変更したいです", cat: "予約", kw: "予約 変更", faq: "予約を変更したいです" },
  { q: "予約をキャンセルしたいです", cat: "予約", kw: "予約 キャンセル", faq: "予約をキャンセルしたいです" },
  { q: "Web予約のやり方を教えてください", cat: "予約", kw: "Web予約 方法", faq: "Web予約のやり方を教えてください" },
  { q: "発熱がありますが受診できますか", cat: "発熱", kw: "発熱 受診", faq: "発熱がありますが受診できますか" },
  { q: "熱が下がらないのですが受診すべきですか", cat: "発熱", kw: "熱 下がらない 受診", faq: "発熱がありますが受診できますか" },
  { q: "子どもが熱を出しました受診できますか", cat: "発熱", kw: "子ども 熱 受診", faq: "発熱がありますが受診できますか" },
  { q: "初診の持ち物を教えてください", cat: "初診", kw: "初診 持ち物", faq: "初診の持ち物を教えてください" },
  { q: "初診の際の流れを教えてください", cat: "初診", kw: "初診 流れ", faq: "初診の際の流れを教えてください" },
  { q: "健康診断を受けられますか", cat: "健康診断", kw: "健康診断 受診", faq: "健康診断を受けられますか" },
  { q: "人間ドックの予約はできますか", cat: "健康診断", kw: "人間ドック 予約", faq: "健康診断を受けられますか" },
  { q: "胃カメラは予約が必要ですか", cat: "内視鏡検査", kw: "胃カメラ 予約", faq: "胃カメラは予約が必要ですか" },
  { q: "大腸カメラの検査日を教えてください", cat: "内視鏡検査", kw: "大腸カメラ 検査日", faq: "胃カメラは予約が必要ですか" },
  { q: "駐車場はありますか", cat: "駐車場", kw: "駐車場 ある", faq: "駐車場はありますか" },
  { q: "駐車場の台数を教えてください", cat: "駐車場", kw: "駐車場 台数", faq: "駐車場はありますか" },
  { q: "最寄り駅からのアクセスを教えてください", cat: "アクセス", kw: "アクセス 駅", faq: "最寄り駅からのアクセスを教えてください" },
  { q: "バスでのアクセスを教えてください", cat: "アクセス", kw: "バス アクセス", faq: "最寄り駅からのアクセスを教えてください" },
  { q: "クレジットカードは使えますか", cat: "支払い", kw: "クレジットカード 使える", faq: "クレジットカードは使えますか" },
  { q: "電子マネーは使えますか", cat: "支払い", kw: "電子マネー 使える", faq: "クレジットカードは使えますか" },
  { q: "処方箋をもらえますか", cat: "薬・処方", kw: "処方箋 もらえる", faq: "処方箋をもらえますか" },
  { q: "薬は院内でもらえますか", cat: "薬・処方", kw: "薬 院内 もらえる", faq: "処方箋をもらえますか" },
  { q: "予防接種の予約はできますか", cat: "予防接種", kw: "予防接種 予約", faq: "予防接種の予約はできますか" },
  { q: "インフルエンザ予防接種の時期を教えてください", cat: "予防接種", kw: "インフルエンザ 予防接種", faq: "予防接種の予約はできますか" },
  { q: "何科を受診すればよいですか", cat: "診療内容", kw: "何科 受診", faq: "何科を受診すればよいですか" },
  { q: "風邪の症状があるのですが受診できますか", cat: "診療内容", kw: "風邪 受診", faq: "何科を受診すればよいですか" },
  { q: "再診の予約方法を教えてください", cat: "予約", kw: "再診 予約 方法", faq: "Web予約のやり方を教えてください" },
  { q: "保険証を忘れたのですがどうすればよいですか", cat: "その他", kw: "保険証 忘れた", faq: "初診の持ち物を教えてください" },
  { q: "診断書を発行してもらえますか", cat: "その他", kw: "診断書 発行", faq: "診断書を発行してもらえますか" },
];

const SOURCES: DemoInquiry["source"][] = ["公式サイト", "LINE", "埋め込みウィジェット"];

// Monthly targets: totals designed for realistic comparisons
// prev-month: -12% to +18%, prev-year: -8% to +25%
const MONTHLY: {
  y: number;
  m: number;
  total: number;
  ansRate: number;
  outRate: number;
  webRate: number;
  phoneRate: number;
}[] = [
  { y: 2025, m: 0, total: 340, ansRate: 0.890, outRate: 0.420, webRate: 0.155, phoneRate: 0.108 },
  { y: 2025, m: 1, total: 315, ansRate: 0.885, outRate: 0.425, webRate: 0.155, phoneRate: 0.108 },
  { y: 2025, m: 2, total: 360, ansRate: 0.890, outRate: 0.415, webRate: 0.156, phoneRate: 0.109 },
  { y: 2025, m: 3, total: 345, ansRate: 0.895, outRate: 0.430, webRate: 0.156, phoneRate: 0.109 },
  { y: 2025, m: 4, total: 380, ansRate: 0.900, outRate: 0.420, webRate: 0.157, phoneRate: 0.109 },
  { y: 2025, m: 5, total: 365, ansRate: 0.895, outRate: 0.435, webRate: 0.157, phoneRate: 0.110 },
  { y: 2025, m: 6, total: 410, ansRate: 0.905, outRate: 0.425, webRate: 0.158, phoneRate: 0.110 },
  { y: 2025, m: 7, total: 395, ansRate: 0.905, outRate: 0.440, webRate: 0.160, phoneRate: 0.112 },
  { y: 2025, m: 8, total: 420, ansRate: 0.910, outRate: 0.430, webRate: 0.158, phoneRate: 0.110 },
  { y: 2025, m: 9, total: 405, ansRate: 0.905, outRate: 0.425, webRate: 0.159, phoneRate: 0.110 },
  { y: 2025, m: 10, total: 440, ansRate: 0.915, outRate: 0.440, webRate: 0.159, phoneRate: 0.111 },
  { y: 2025, m: 11, total: 425, ansRate: 0.910, outRate: 0.440, webRate: 0.160, phoneRate: 0.111 },
  { y: 2026, m: 0, total: 380, ansRate: 0.910, outRate: 0.435, webRate: 0.159, phoneRate: 0.110 },
  { y: 2026, m: 1, total: 360, ansRate: 0.905, outRate: 0.430, webRate: 0.159, phoneRate: 0.110 },
  { y: 2026, m: 2, total: 400, ansRate: 0.915, outRate: 0.425, webRate: 0.160, phoneRate: 0.111 },
  { y: 2026, m: 3, total: 385, ansRate: 0.910, outRate: 0.440, webRate: 0.160, phoneRate: 0.111 },
  { y: 2026, m: 4, total: 420, ansRate: 0.915, outRate: 0.430, webRate: 0.160, phoneRate: 0.111 },
  { y: 2026, m: 5, total: 405, ansRate: 0.910, outRate: 0.445, webRate: 0.160, phoneRate: 0.111 },
  { y: 2026, m: 6, total: 445, ansRate: 0.915, outRate: 0.435, webRate: 0.160, phoneRate: 0.111 },
  { y: 2026, m: 7, total: 486, ansRate: 0.920, outRate: 0.440, webRate: 0.1605, phoneRate: 0.1111 },
];

// August 2026 exact category distribution (sums to 486)
const AUG_2026_CATS: Record<string, number> = {
  予約: 116,
  診療時間: 82,
  診療内容: 64,
  発熱: 52,
  初診: 43,
  アクセス: 22,
  駐車場: 17,
  予防接種: 22,
  内視鏡検査: 20,
  "薬・処方": 23,
  その他: 25,
};

// August 2026 exact time type distribution (sums to 486, outside = 214)
const AUG_2026_TT: Record<string, number> = {
  診療時間内: 272,
  診療開始前: 55,
  昼休診: 48,
  診療終了後: 72,
  休診日: 39,
};

// Base category proportions (derived from Aug 2026)
const BASE_CAT_PROP: Record<string, number> = {
  予約: 116 / 486,
  診療時間: 82 / 486,
  診療内容: 64 / 486,
  発熱: 52 / 486,
  初診: 43 / 486,
  アクセス: 22 / 486,
  駐車場: 17 / 486,
  予防接種: 22 / 486,
  内視鏡検査: 20 / 486,
  "薬・処方": 23 / 486,
  その他: 25 / 486,
};

// Deterministic PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function seasonalMultiplier(cat: string, month: number): number {
  if ((month === 0 || month === 1 || month === 11) && cat === "発熱") return 1.25;
  if ((month === 6 || month === 7) && cat === "発熱") return 1.15;
  if (month >= 8 && month <= 10 && cat === "予防接種") return 1.20;
  if (month >= 2 && month <= 4 && cat === "初診") return 1.12;
  if (month >= 8 && month <= 10 && cat === "内視鏡検査") return 1.10;
  return 1.0;
}

function computeCategories(total: number, month: number): Record<string, number> {
  const adjusted: Record<string, number> = {};
  let sum = 0;
  for (const cat of Object.keys(BASE_CAT_PROP)) {
    adjusted[cat] = BASE_CAT_PROP[cat] * seasonalMultiplier(cat, month);
    sum += adjusted[cat];
  }
  const result: Record<string, number> = {};
  let assigned = 0;
  const cats = Object.keys(adjusted);
  for (let i = 0; i < cats.length - 1; i++) {
    const c = cats[i];
    result[c] = Math.round(total * (adjusted[c] / sum));
    assigned += result[c];
  }
  result[cats[cats.length - 1]] = total - assigned;
  return result;
}

function computeTimeTypes(total: number, outsideHours: number): Record<string, number> {
  const inside = total - outsideHours;
  const beforeOpen = Math.round(outsideHours * 0.257);
  const lunch = Math.round(outsideHours * 0.224);
  const afterClose = Math.round(outsideHours * 0.336);
  const closedDay = outsideHours - beforeOpen - lunch - afterClose;
  return {
    診療時間内: inside,
    診療開始前: beforeOpen,
    昼休診: lunch,
    診療終了後: afterClose,
    休診日: closedDay,
  };
}

function buildArray(counts: Record<string, number>, total: number): string[] {
  const arr: string[] = [];
  for (const [key, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) arr.push(key);
  }
  if (arr.length > total) arr.length = total;
  while (arr.length < total) arr.push("その他");
  return arr;
}

function pickQuestion(cat: string, rng: () => number) {
  const matching = QUESTIONS.filter((q) => q.cat === cat);
  if (matching.length === 0) {
    const fallback = QUESTIONS.filter((q) => q.cat === "その他");
    return fallback[Math.floor(rng() * Math.max(1, fallback.length))] ?? QUESTIONS[0];
  }
  return matching[Math.floor(rng() * matching.length)];
}

function generateTimestamp(year: number, month: number, timeType: string, rng: () => number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const validDays: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (timeType === "休診日") {
      if (dow === 0 || dow === 3) validDays.push(d);
    } else {
      if (dow !== 0 && dow !== 3) validDays.push(d);
    }
  }
  const dayPool = validDays.length > 0 ? validDays : Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const day = dayPool[Math.floor(rng() * dayPool.length)];

  let hour: number;
  switch (timeType) {
    case "診療時間内":
      hour = rng() < 0.5 ? 9 + Math.floor(rng() * 3) : 15 + Math.floor(rng() * 3);
      break;
    case "診療開始前":
      hour = 6 + Math.floor(rng() * 3);
      break;
    case "昼休診":
      hour = 12 + Math.floor(rng() * 3);
      break;
    case "診療終了後":
      hour = 18 + Math.floor(rng() * 5);
      break;
    default:
      hour = Math.floor(rng() * 24);
  }
  const minute = Math.floor(rng() * 60);
  return new Date(year, month, day, hour, minute, 0);
}

function assignAnswered(ttArr: string[], answered: number, rng: () => number): boolean[] {
  const total = ttArr.length;
  const result = new Array(total).fill(false);
  const insideIdx: number[] = [];
  const outsideIdx: number[] = [];
  for (let i = 0; i < total; i++) {
    if (ttArr[i] === "診療時間内") insideIdx.push(i);
    else outsideIdx.push(i);
  }
  shuffle(insideIdx, rng);
  shuffle(outsideIdx, rng);
  const outsideAns = Math.min(outsideIdx.length, Math.round(outsideIdx.length * 0.85));
  const insideAns = Math.min(insideIdx.length, answered - outsideAns);
  for (let i = 0; i < insideAns; i++) result[insideIdx[i]] = true;
  for (let i = 0; i < outsideAns; i++) result[outsideIdx[i]] = true;
  let current = result.filter(Boolean).length;
  if (current < answered) {
    for (let i = 0; i < total && current < answered; i++) {
      if (!result[i]) { result[i] = true; current++; }
    }
  } else if (current > answered) {
    for (let i = total - 1; i >= 0 && current > answered; i--) {
      if (result[i]) { result[i] = false; current--; }
    }
  }
  return result;
}

function assignActions(
  catArr: string[],
  answeredArr: boolean[],
  webRes: number,
  phone: number,
  rng: () => number,
): DemoInquiry["action"][] {
  const total = catArr.length;
  const result: DemoInquiry["action"][] = new Array(total).fill("なし" as DemoInquiry["action"]);

  const resIdx: number[] = [];
  for (let i = 0; i < total; i++) {
    if (catArr[i] === "予約" && answeredArr[i]) resIdx.push(i);
  }
  shuffle(resIdx, rng);
  for (let i = 0; i < Math.min(webRes, resIdx.length); i++) result[resIdx[i]] = "Web予約";

  const phoneIdx: number[] = [];
  for (let i = 0; i < total; i++) {
    if (answeredArr[i] && result[i] === "なし") phoneIdx.push(i);
  }
  shuffle(phoneIdx, rng);
  for (let i = 0; i < Math.min(phone, phoneIdx.length); i++) result[phoneIdx[i]] = "電話";

  const accessIdx: number[] = [];
  for (let i = 0; i < total; i++) {
    if ((catArr[i] === "アクセス" || catArr[i] === "駐車場") && answeredArr[i] && result[i] === "なし") {
      accessIdx.push(i);
    }
  }
  shuffle(accessIdx, rng);
  const accessCount = Math.min(Math.floor(accessIdx.length * 0.3), accessIdx.length);
  for (let i = 0; i < accessCount; i++) result[accessIdx[i]] = "アクセス確認";

  return result;
}

function generateInquiries(): DemoInquiry[] {
  const allRecords: DemoInquiry[] = [];
  let id = 1;

  for (const monthly of MONTHLY) {
    const { y, m, total, ansRate, outRate, webRate, phoneRate } = monthly;
    const rng = mulberry32(y * 1000 + m * 100 + 42);
    const isAug2026 = y === 2026 && m === 7;

    const answered = isAug2026 ? 447 : Math.round(total * ansRate);
    const outsideHours = isAug2026 ? 214 : Math.round(total * outRate);
    const webRes = isAug2026 ? 78 : Math.round(total * webRate);
    const phone = isAug2026 ? 54 : Math.round(total * phoneRate);

    const cats = isAug2026 ? AUG_2026_CATS : computeCategories(total, m);
    const timeTypes = isAug2026 ? AUG_2026_TT : computeTimeTypes(total, outsideHours);

    const catArr = buildArray(cats, total);
    const ttArr = buildArray(timeTypes, total);
    shuffle(catArr, rng);
    shuffle(ttArr, rng);

    const answeredArr = assignAnswered(ttArr, answered, rng);
    const actionArr = assignActions(catArr, answeredArr, webRes, phone, rng);

    for (let i = 0; i < total; i++) {
      const cat = catArr[i];
      const tt = ttArr[i] as DemoInquiry["timeType"];
      const ans = answeredArr[i];
      const ts = generateTimestamp(y, m, tt, rng);
      const q = pickQuestion(cat, rng);
      const r = rng();
      const source: DemoInquiry["source"] = r < 0.5 ? "公式サイト" : r < 0.8 ? "LINE" : "埋め込みウィジェット";

      allRecords.push({
        id: `inq-${String(id++).padStart(5, "0")}`,
        receivedAt: ts.toISOString(),
        question: q.q,
        category: cat,
        keyword: q.kw,
        matchedFaq: ans ? q.faq : undefined,
        answered: ans,
        timeType: tt,
        source,
        action: actionArr[i],
      });
    }
  }

  return allRecords;
}

export const DEMO_INQUIRIES: DemoInquiry[] = generateInquiries();
export const DEMO_DATA_VERSION = "demo-analytics-v1";
