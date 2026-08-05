import { DEMO_INQUIRIES, type DemoInquiry, DEMO_CATEGORIES } from "@/data/demoAnalyticsData";

export type PeriodFilter = {
  year: number | "all";
  month: number | "all"; // 0-11 or "all"
  category: string | "all";
  answered: "all" | "answered" | "unanswered";
  timeType: "all" | DemoInquiry["timeType"];
  source: "all" | DemoInquiry["source"];
};

export type SummaryStats = {
  total: number;
  answered: number;
  unanswered: number;
  answerRate: number;
  outsideHours: number;
  outsideHoursRate: number;
  reservationClicks: number;
  phoneClicks: number;
};

export type Comparison = {
  prevMonth?: string;
  prevYear?: string;
};

export type SummaryWithComparison = SummaryStats & {
  prevMonth?: SummaryStats;
  prevYear?: SummaryStats;
};

export const DEFAULT_PERIOD: PeriodFilter = {
  year: 2026,
  month: 7, // August (0-indexed)
  category: "all",
  answered: "all",
  timeType: "all",
  source: "all",
};

export function filterInquiries(
  inquiries: DemoInquiry[],
  filter: PeriodFilter,
): DemoInquiry[] {
  return inquiries.filter((inq) => {
    const d = new Date(inq.receivedAt);
    if (filter.year !== "all" && d.getFullYear() !== filter.year) return false;
    if (filter.month !== "all" && d.getMonth() !== filter.month) return false;
    if (filter.category !== "all" && inq.category !== filter.category) return false;
    if (filter.answered === "answered" && !inq.answered) return false;
    if (filter.answered === "unanswered" && inq.answered) return false;
    if (filter.timeType !== "all" && inq.timeType !== filter.timeType) return false;
    if (filter.source !== "all" && inq.source !== filter.source) return false;
    return true;
  });
}

export function calcSummary(inquiries: DemoInquiry[]): SummaryStats {
  const total = inquiries.length;
  const answered = inquiries.filter((i) => i.answered).length;
  const unanswered = total - answered;
  const answerRate = total ? (answered / total) * 100 : 0;
  const outsideHours = inquiries.filter(
    (i) => i.timeType !== "診療時間内",
  ).length;
  const outsideHoursRate = total ? (outsideHours / total) * 100 : 0;
  const reservationClicks = inquiries.filter((i) => i.action === "Web予約").length;
  const phoneClicks = inquiries.filter((i) => i.action === "電話").length;
  return {
    total,
    answered,
    unanswered,
    answerRate,
    outsideHours,
    outsideHoursRate,
    reservationClicks,
    phoneClicks,
  };
}

function getPrevMonthPeriod(filter: PeriodFilter): PeriodFilter {
  if (filter.month === "all" || filter.year === "all") return { ...filter, year: "all", month: "all" };
  let m = filter.month - 1;
  let y = filter.year;
  if (m < 0) {
    m = 11;
    y = y - 1;
  }
  return { ...filter, month: m, year: y };
}

function getPrevYearPeriod(filter: PeriodFilter): PeriodFilter {
  if (filter.year === "all") return filter;
  return { ...filter, year: filter.year - 1 };
}

export function calcSummaryWithComparison(
  filter: PeriodFilter,
): SummaryWithComparison {
  const current = calcSummary(filterInquiries(DEMO_INQUIRIES, filter));
  const prevMonthFilter = getPrevMonthPeriod(filter);
  const prevYearFilter = getPrevYearPeriod(filter);

  const prevMonthData = filterInquiries(DEMO_INQUIRIES, prevMonthFilter);
  const prevYearData = filterInquiries(DEMO_INQUIRIES, prevYearFilter);

  return {
    ...current,
    prevMonth: prevMonthData.length > 0 ? calcSummary(prevMonthData) : undefined,
    prevYear: prevYearData.length > 0 ? calcSummary(prevYearData) : undefined,
  };
}

export function formatComparison(current: number, prev?: number): string | null {
  if (prev === undefined || prev === 0) return null;
  const diff = ((current - prev) / prev) * 100;
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}%`;
}

// Monthly trend (last N months ending at the filter period)
export function getMonthlyTrend(filter: PeriodFilter, months = 12) {
  const endYear = filter.year === "all" ? 2026 : filter.year;
  const endMonth = filter.month === "all" ? 7 : filter.month;

  const result: {
    label: string;
    total: number;
    answered: number;
    outsideHours: number;
  }[] = [];

  let y = endYear;
  let m = endMonth;
  for (let i = 0; i < months; i++) {
    const monthInquiries = DEMO_INQUIRIES.filter((inq) => {
      const d = new Date(inq.receivedAt);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const label = `${y}年${m + 1}月`;
    result.unshift({
      label,
      total: monthInquiries.length,
      answered: monthInquiries.filter((i) => i.answered).length,
      outsideHours: monthInquiries.filter((i) => i.timeType !== "診療時間内").length,
    });
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
  }
  return result;
}

export function getCategoryBreakdown(inquiries: DemoInquiry[]) {
  const total = inquiries.length;
  return DEMO_CATEGORIES.map((cat) => {
    const count = inquiries.filter((i) => i.category === cat).length;
    return {
      category: cat,
      count,
      percentage: total ? (count / total) * 100 : 0,
    };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function getHourlyDistribution(inquiries: DemoInquiry[]) {
  const hours = Array.from({ length: 24 }, (_, h) => {
    const count = inquiries.filter((i) => new Date(i.receivedAt).getHours() === h).length;
    const isBusinessHour = isBusinessHourForHour(h);
    return { hour: h, count, isBusinessHour };
  });
  return hours;
}

function isBusinessHourForHour(h: number): boolean {
  // Business: 9-11, 15-17 (Mon-Sat). For chart purposes, treat 9-11 and 15-17 as business hours.
  return (h >= 9 && h <= 11) || (h >= 15 && h <= 17);
}

export function getWeekdayDistribution(inquiries: DemoInquiry[]) {
  const labels = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  return dayOrder.map((d, idx) => ({
    weekday: labels[idx],
    count: inquiries.filter((i) => new Date(i.receivedAt).getDay() === d).length,
    isClosed: d === 0 || d === 3, // Sun, Wed closed
  }));
}

export function getTimeTypeBreakdown(inquiries: DemoInquiry[]) {
  const types: DemoInquiry["timeType"][] = ["診療時間内", "診療開始前", "昼休診", "診療終了後", "休診日"];
  return types.map((t) => ({
    type: t,
    count: inquiries.filter((i) => i.timeType === t).length,
  }));
}

export function getTopQuestions(inquiries: DemoInquiry[], n = 5) {
  const total = inquiries.length;
  const counts = new Map<string, number>();
  for (const inq of inquiries) {
    counts.set(inq.question, (counts.get(inq.question) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([question, count]) => ({ question, count, percentage: total ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function getKeywordRanking(inquiries: DemoInquiry[], n = 10) {
  const counts = new Map<string, number>();
  for (const inq of inquiries) {
    const words = inq.keyword.split(" ");
    for (const w of words) {
      if (w) counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function getUnansweredRanking(inquiries: DemoInquiry[], n = 5) {
  const unanswered = inquiries.filter((i) => !i.answered);
  const counts = new Map<string, number>();
  for (const inq of unanswered) {
    counts.set(inq.question, (counts.get(inq.question) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function getMonthlyCategoryTrend(filter: PeriodFilter, months = 6) {
  const endYear = filter.year === "all" ? 2026 : filter.year;
  const endMonth = filter.month === "all" ? 7 : filter.month;
  const topCats = getCategoryBreakdown(filterInquiries(DEMO_INQUIRIES, filter))
    .slice(0, 5)
    .map((c) => c.category);

  const result: Record<string, number[]> = {};
  topCats.forEach((c) => (result[c] = []));

  const labels: string[] = [];
  let y = endYear;
  let m = endMonth;
  const periods: { y: number; m: number }[] = [];
  for (let i = 0; i < months; i++) {
    periods.unshift({ y, m });
    labels.push(`${y}年${m + 1}月`);
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
  }

  for (const p of periods) {
    const monthInquiries = DEMO_INQUIRIES.filter((inq) => {
      const d = new Date(inq.receivedAt);
      return d.getFullYear() === p.y && d.getMonth() === p.m;
    });
    for (const cat of topCats) {
      result[cat].push(monthInquiries.filter((i) => i.category === cat).length);
    }
  }

  return { labels, data: result, categories: topCats };
}

export function getIncreasingNeeds(filter: PeriodFilter) {
  const current = getCategoryBreakdown(filterInquiries(DEMO_INQUIRIES, filter));
  const prevFilter = getPrevMonthPeriod(filter);
  const prev = getCategoryBreakdown(filterInquiries(DEMO_INQUIRIES, prevFilter));

  return current
    .map((c) => {
      const prevCount = prev.find((p) => p.category === c.category)?.count ?? 0;
      const diff = prevCount > 0 ? ((c.count - prevCount) / prevCount) * 100 : 0;
      return { category: c.category, count: c.count, prevCount, diff };
    })
    .filter((c) => c.diff > 0)
    .sort((a, b) => b.diff - a.diff);
}

export function getOutsideHoursInsights(inquiries: DemoInquiry[]) {
  const outsideHours = inquiries.filter((i) => i.timeType !== "診療時間内");
  const outsideByCategory = getCategoryBreakdown(outsideHours);
  const topOutsideCategory = outsideByCategory[0]?.category ?? "—";

  const hourly = getHourlyDistribution(inquiries);
  const peakHour = hourly.reduce((max, h) => (h.count > max.count ? h : max), hourly[0]);

  const weekday = getWeekdayDistribution(inquiries);
  const busiestWeekday = weekday.reduce((max, w) => (w.count > max.count ? w : max), weekday[0]);

  const weekendCount = inquiries.filter((i) => {
    const day = new Date(i.receivedAt).getDay();
    return day === 0 || day === 6;
  }).length;

  return {
    topOutsideCategory,
    peakHour: peakHour ? `${peakHour.hour}:00` : "—",
    busiestWeekday: busiestWeekday?.weekday ?? "—",
    weekendCount,
  };
}

export const AVAILABLE_YEARS = [2025, 2026];
export const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];
