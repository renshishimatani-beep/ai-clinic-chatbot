import { useMemo, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Calendar,
  Phone,
  CalendarCheck,
  MapPin,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import type { DemoInquiry } from "@/data/demoAnalyticsData";
import { DEMO_CATEGORIES } from "@/data/demoAnalyticsData";
import {
  type PeriodFilter,
  DEFAULT_PERIOD,
  AVAILABLE_YEARS,
  MONTH_LABELS,
  filterInquiries,
  calcSummaryWithComparison,
  formatComparison,
  getMonthlyTrend,
  getCategoryBreakdown,
  getHourlyDistribution,
  getWeekdayDistribution,
  getTimeTypeBreakdown,
  getTopQuestions,
  getKeywordRanking,
  getUnansweredRanking,
  getMonthlyCategoryTrend,
  getIncreasingNeeds,
  getOutsideHoursInsights,
} from "@/services/analyticsService";
import { DemoDataBadge } from "@/components/analytics/DemoDataBadge";
import { SummaryCard } from "@/components/analytics/SummaryCard";
import {
  MonthlyTrendChart,
  CategoryDonutChart,
  CategoryBarChart,
  HourlyChart,
  WeekdayChart,
  TimeTypeChart,
  MonthlyCategoryTrendChart,
} from "@/components/analytics/Charts";

type Tab = "概要" | "問い合わせ一覧" | "時間帯分析" | "ニーズ分析";

const TIME_TYPES: DemoInquiry["timeType"][] = [
  "診療時間内",
  "診療開始前",
  "昼休診",
  "診療終了後",
  "休診日",
];
const SOURCES: DemoInquiry["source"][] = ["公式サイト", "LINE", "埋め込みウィジェット"];

export function InquiryAnalytics() {
  const [tab, setTab] = useState<Tab>("概要");
  const [filter, setFilter] = useState<PeriodFilter>(DEFAULT_PERIOD);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">問い合わせ分析</h2>
          <p className="text-sm text-slate-500">デモデータに基づく分析ダッシュボード</p>
        </div>
      </div>

      <DemoDataBadge />

      <PeriodFilters filter={filter} setFilter={setFilter} />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {(["概要", "問い合わせ一覧", "時間帯分析", "ニーズ分析"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${
              tab === t
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "概要" && <OverviewTab filter={filter} />}
      {tab === "問い合わせ一覧" && <InquiryListTab filter={filter} />}
      {tab === "時間帯分析" && <TimeAnalysisTab filter={filter} />}
      {tab === "ニーズ分析" && <NeedsAnalysisTab filter={filter} />}
    </div>
  );
}

/* ---------- Period Filters ---------- */
function PeriodFilters({
  filter,
  setFilter,
}: {
  filter: PeriodFilter;
  setFilter: (f: PeriodFilter) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6 flex flex-wrap gap-3">
      <FilterSelect
        label="年"
        value={String(filter.year)}
        onChange={(v) => setFilter({ ...filter, year: v === "all" ? "all" : Number(v) })}
        options={[
          { value: "all", label: "すべての年" },
          ...AVAILABLE_YEARS.map((y) => ({ value: String(y), label: `${y}年` })),
        ]}
      />
      <FilterSelect
        label="月"
        value={String(filter.month)}
        onChange={(v) => setFilter({ ...filter, month: v === "all" ? "all" : Number(v) })}
        options={[
          { value: "all", label: "すべての月" },
          ...MONTH_LABELS.map((m, i) => ({ value: String(i), label: m })),
        ]}
      />
      <FilterSelect
        label="カテゴリー"
        value={filter.category}
        onChange={(v) => setFilter({ ...filter, category: v })}
        options={[
          { value: "all", label: "すべて" },
          ...DEMO_CATEGORIES.map((c) => ({ value: c, label: c })),
        ]}
      />
      <FilterSelect
        label="回答状況"
        value={filter.answered}
        onChange={(v) => setFilter({ ...filter, answered: v as PeriodFilter["answered"] })}
        options={[
          { value: "all", label: "すべて" },
          { value: "answered", label: "回答済み" },
          { value: "unanswered", label: "未回答" },
        ]}
      />
      <FilterSelect
        label="診療時間"
        value={filter.timeType}
        onChange={(v) => setFilter({ ...filter, timeType: v as PeriodFilter["timeType"] })}
        options={[
          { value: "all", label: "すべて" },
          ...TIME_TYPES.map((t) => ({ value: t, label: t })),
        ]}
      />
      <FilterSelect
        label="流入元"
        value={filter.source}
        onChange={(v) => setFilter({ ...filter, source: v as PeriodFilter["source"] })}
        options={[
          { value: "all", label: "すべて" },
          ...SOURCES.map((s) => ({ value: s, label: s })),
        ]}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="focus-ring rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------- Overview Tab ---------- */
function OverviewTab({ filter }: { filter: PeriodFilter }) {
  const stats = useMemo(() => calcSummaryWithComparison(filter), [filter]);
  const trend = useMemo(() => getMonthlyTrend(filter, 12), [filter]);
  const filtered = useMemo(() => filterInquiries(
    // re-import to avoid circular; use DEMO_INQUIRIES via service
    filterInquiries(getAllInquiries(), filter),
    filter,
  ), [filter]);
  const categories = useMemo(() => getCategoryBreakdown(filtered), [filtered]);

  const cards = [
    {
      label: "問い合わせ総数",
      value: `${stats.total}件`,
      color: "#0EA5E9",
      prevMonth: formatComparison(stats.total, stats.prevMonth?.total),
      prevYear: formatComparison(stats.total, stats.prevYear?.total),
    },
    {
      label: "AI回答数",
      value: `${stats.answered}件`,
      color: "#22C55E",
      prevMonth: formatComparison(stats.answered, stats.prevMonth?.answered),
      prevYear: formatComparison(stats.answered, stats.prevYear?.answered),
    },
    {
      label: "回答率",
      value: `${stats.answerRate.toFixed(1)}%`,
      color: "#8B5CF6",
      prevMonth: formatComparison(stats.answerRate, stats.prevMonth?.answerRate),
      prevYear: formatComparison(stats.answerRate, stats.prevYear?.answerRate),
    },
    {
      label: "未回答数",
      value: `${stats.unanswered}件`,
      color: "#F59E0B",
      prevMonth: formatComparison(stats.unanswered, stats.prevMonth?.unanswered),
      prevYear: formatComparison(stats.unanswered, stats.prevYear?.unanswered),
    },
    {
      label: "休診時間の問い合わせ",
      value: `${stats.outsideHours}件`,
      color: "#EF4444",
      prevMonth: formatComparison(stats.outsideHours, stats.prevMonth?.outsideHours),
      prevYear: formatComparison(stats.outsideHours, stats.prevYear?.outsideHours),
    },
    {
      label: "休診時間問い合わせ率",
      value: `${stats.outsideHoursRate.toFixed(1)}%`,
      color: "#F97316",
      prevMonth: formatComparison(stats.outsideHoursRate, stats.prevMonth?.outsideHoursRate),
      prevYear: formatComparison(stats.outsideHoursRate, stats.prevYear?.outsideHoursRate),
    },
    {
      label: "Web予約クリック",
      value: `${stats.reservationClicks}件`,
      color: "#14B8A6",
      prevMonth: formatComparison(stats.reservationClicks, stats.prevMonth?.reservationClicks),
      prevYear: formatComparison(stats.reservationClicks, stats.prevYear?.reservationClicks),
    },
    {
      label: "電話クリック",
      value: `${stats.phoneClicks}件`,
      color: "#6366F1",
      prevMonth: formatComparison(stats.phoneClicks, stats.prevMonth?.phoneClicks),
      prevYear: formatComparison(stats.phoneClicks, stats.prevYear?.phoneClicks),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <SummaryCard key={c.label} card={c} />
        ))}
      </div>

      <ChartCard title="月別問い合わせ推移" subtitle="直近12ヶ月">
        <MonthlyTrendChart data={trend} />
      </ChartCard>

      <ChartCard title="問い合わせカテゴリー" subtitle="カテゴリー別の内訳">
        <CategoryDonutChart data={categories} />
      </ChartCard>
    </div>
  );
}

/* ---------- Inquiry List Tab ---------- */
function InquiryListTab({ filter }: { filter: PeriodFilter }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [answeredFilter, setAnsweredFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<DemoInquiry | null>(null);

  const inquiries = useMemo(() => {
    let result = filterInquiries(getAllInquiries(), filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.question.toLowerCase().includes(q) ||
          i.keyword.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }
    if (catFilter !== "all") result = result.filter((i) => i.category === catFilter);
    if (answeredFilter !== "all") {
      result = result.filter((i) =>
        answeredFilter === "answered" ? i.answered : !i.answered,
      );
    }
    if (timeFilter !== "all") result = result.filter((i) => i.timeType === timeFilter);
    result = [...result].sort((a, b) => {
      const cmp = new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
      return sortOrder === "newest" ? -cmp : cmp;
    });
    return result;
  }, [filter, search, catFilter, answeredFilter, timeFilter, sortOrder]);

  const perPage = 20;
  const totalPages = Math.ceil(inquiries.length / perPage);
  const pageData = inquiries.slice(page * perPage, (page + 1) * perPage);

  // Reset page when filters change
  function resetPage() {
    setPage(0);
  }

  return (
    <div className="space-y-4">
      {/* Search & filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="問い合わせ内容を検索…"
            className="focus-ring w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => {
            setCatFilter(e.target.value);
            resetPage();
          }}
          className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">すべてのカテゴリー</option>
          {DEMO_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={answeredFilter}
          onChange={(e) => {
            setAnsweredFilter(e.target.value);
            resetPage();
          }}
          className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">回答状況: すべて</option>
          <option value="answered">回答済み</option>
          <option value="unanswered">未回答</option>
        </select>
        <select
          value={timeFilter}
          onChange={(e) => {
            setTimeFilter(e.target.value);
            resetPage();
          }}
          className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">診療時間: すべて</option>
          {TIME_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
          className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="newest">新着順</option>
          <option value="oldest">古い順</option>
        </select>
      </div>

      <p className="text-sm text-slate-500">{inquiries.length}件の問い合わせ</p>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-left">
                <th className="px-4 py-3 font-medium whitespace-nowrap">受信日時</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">問い合わせ内容</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">カテゴリー</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">回答状況</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">一致したFAQ</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">診療時間区分</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">流入元</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">アクション</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((inq) => (
                <tr
                  key={inq.id}
                  onClick={() => setSelected(inq)}
                  className="border-t border-slate-100 hover:bg-sky-50/50 cursor-pointer transition"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatDateTime(inq.receivedAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-800 max-w-[240px] truncate">{inq.question}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-semibold text-sky-600 bg-sky-50 rounded-full px-2 py-0.5">
                      {inq.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <AnsweredBadge answered={inq.answered} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">
                    {inq.matchedFaq ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <TimeTypeBadge type={inq.timeType} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{inq.source}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{inq.action}</td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    該当する問い合わせがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {page + 1} / {totalPages} ページ
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="focus-ring rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft size={14} /> 前へ
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="focus-ring rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                次へ <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <InquiryDetailModal inquiry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ---------- Time Analysis Tab ---------- */
function TimeAnalysisTab({ filter }: { filter: PeriodFilter }) {
  const filtered = useMemo(() => filterInquiries(getAllInquiries(), filter), [filter]);
  const hourly = useMemo(() => getHourlyDistribution(filtered), [filtered]);
  const weekday = useMemo(() => getWeekdayDistribution(filtered), [filtered]);
  const timeTypes = useMemo(() => getTimeTypeBreakdown(filtered), [filtered]);
  const insights = useMemo(() => getOutsideHoursInsights(filtered), [filtered]);

  const outsideHoursTotal = filtered.filter((i) => i.timeType !== "診療時間内").length;
  const outsideRate = filtered.length ? (outsideHoursTotal / filtered.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Insight card */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Lightbulb size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">営業外の問い合わせ分析</p>
            <p className="text-sm text-slate-600 mt-1">
              問い合わせのうち{outsideRate.toFixed(0)}%が、スタッフが電話対応できない時間帯に発生しています。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="時間帯別問い合わせ" subtitle="0:00〜23:59（青=診療時間内、灰=休診時間）">
          <HourlyChart data={hourly} />
        </ChartCard>
        <ChartCard title="曜日別問い合わせ" subtitle="月〜日（青=営業日、オレンジ=休診日）">
          <WeekdayChart data={weekday} />
        </ChartCard>
      </div>

      <ChartCard title="診療時間内・休診時間" subtitle="時間区分別の問い合わせ件数">
        <TimeTypeChart data={timeTypes} />
      </ChartCard>

      {/* Outside hours breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">休診時間の内訳</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {timeTypes
            .filter((t) => t.type !== "診療時間内")
            .map((t) => (
              <div key={t.type} className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-2xl font-bold text-amber-600">{t.count}</p>
                <p className="text-xs text-slate-500 mt-1">{t.type}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="最多休診時間カテゴリー" value={insights.topOutsideCategory} icon={<TrendingUp size={18} />} color="#F59E0B" />
        <MiniStat label="ピーク時間帯" value={insights.peakHour} icon={<Clock size={18} />} color="#0EA5E9" />
        <MiniStat label="最も多い曜日" value={insights.busiestWeekday} icon={<Calendar size={18} />} color="#22C55E" />
        <MiniStat label="週末の問い合わせ" value={`${insights.weekendCount}件`} icon={<Calendar size={18} />} color="#8B5CF6" />
      </div>
    </div>
  );
}

/* ---------- Needs Analysis Tab ---------- */
function NeedsAnalysisTab({ filter }: { filter: PeriodFilter }) {
  const filtered = useMemo(() => filterInquiries(getAllInquiries(), filter), [filter]);
  const categories = useMemo(() => getCategoryBreakdown(filtered), [filtered]);
  const keywords = useMemo(() => getKeywordRanking(filtered, 10), [filtered]);
  const topQuestions = useMemo(() => getTopQuestions(filtered, 5), [filtered]);
  const unansweredRanking = useMemo(() => getUnansweredRanking(filtered, 5), [filtered]);
  const trend = useMemo(() => getMonthlyCategoryTrend(filter, 6), [filter]);
  const increasing = useMemo(() => getIncreasingNeeds(filter), [filter]);

  const topCategory = categories[0];
  const feverTrend = increasing.find((i) => i.category === "発熱");
  const outsideHoursCats = useMemo(() => {
    const outside = filtered.filter((i) => i.timeType !== "診療時間内");
    const cats = getCategoryBreakdown(outside);
    return cats.slice(0, 2);
  }, [filtered]);

  const insights = [
    topCategory
      ? `予約に関する問い合わせが最も多く、全体の${topCategory.percentage.toFixed(0)}%を占めています。`
          .replace("予約", topCategory.category)
      : null,
    feverTrend
      ? `発熱に関する問い合わせは前月比${feverTrend.diff.toFixed(0)}%増加しています。`
      : null,
    outsideHoursCats.length >= 2
      ? `休診時間中は、${outsideHoursCats[0].category}と${outsideHoursCats[1].category}の問い合わせが多く発生しています。`
      : null,
    unansweredRanking.length > 0
      ? "未回答質問をFAQへ追加することで、回答率の改善が見込めます。"
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Insight cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((text, i) => (
          <div
            key={i}
            className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                <Lightbulb size={18} className="text-sky-600" />
              </div>
              <p className="text-sm text-slate-700 pt-1">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="カテゴリーランキング" subtitle="問い合わせ数の多い順">
          <CategoryBarChart data={categories.slice(0, 10)} />
        </ChartCard>
        <ChartCard title="月別カテゴリー推移" subtitle="直近6ヶ月の上位5カテゴリー">
          <MonthlyCategoryTrendChart labels={trend.labels} data={trend.data} categories={trend.categories} />
        </ChartCard>
      </div>

      {/* Top questions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">よく聞かれている質問 トップ5</h3>
        <div className="space-y-3">
          {topQuestions.map((q, i) => (
            <div key={q.question} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-sky-50 text-sky-600 text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-slate-700 flex-1 truncate">{q.question}</span>
              <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">{q.count}件</span>
              <span className="text-xs text-slate-400 whitespace-nowrap w-12 text-right">
                {q.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keyword ranking */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">キーワードランキング</h3>
          <div className="space-y-2">
            {keywords.map((k, i) => (
              <div key={k.keyword} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-50 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700 flex-1">{k.keyword}</span>
                <span className="text-sm font-semibold text-slate-800">{k.count}件</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unanswered ranking */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">未回答質問ランキング</h3>
          <div className="space-y-2">
            {unansweredRanking.length > 0 ? (
              unansweredRanking.map((q, i) => (
                <div key={q.question} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-700 flex-1 truncate">{q.question}</span>
                  <span className="text-sm font-semibold text-amber-600">{q.count}件</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">未回答の質問はありません</p>
            )}
          </div>
        </div>
      </div>

      {/* Increasing needs */}
      {increasing.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">前月比で増加しているニーズ</h3>
          <div className="space-y-2">
            {increasing.slice(0, 5).map((n) => (
              <div key={n.category} className="flex items-center gap-3">
                <span className="text-sm text-slate-700 flex-1">{n.category}</span>
                <span className="text-sm text-slate-500">{n.count}件</span>
                <span className="text-sm font-semibold text-green-600 flex items-center gap-0.5">
                  <TrendingUp size={12} />+{n.diff.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Shared Components ---------- */
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {icon}
      </div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function AnsweredBadge({ answered }: { answered: boolean }) {
  return answered ? (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 rounded-full px-2 py-0.5">
      回答済み
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
      未回答
    </span>
  );
}

function TimeTypeBadge({ type }: { type: DemoInquiry["timeType"] }) {
  const isBusiness = type === "診療時間内";
  return (
    <span
      className={`inline-flex items-center text-xs rounded-full px-2 py-0.5 ${
        isBusiness ? "text-sky-600 bg-sky-50" : "text-amber-600 bg-amber-50"
      }`}
    >
      {type}
    </span>
  );
}

function InquiryDetailModal({
  inquiry,
  onClose,
}: {
  inquiry: DemoInquiry;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">問い合わせ詳細</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <DetailRow icon={<Calendar size={16} />} label="受信日時" value={formatDateTime(inquiry.receivedAt)} />
          <DetailRow label="問い合わせ内容" value={inquiry.question} />
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-semibold text-sky-600 bg-sky-50 rounded-full px-2 py-1">
              {inquiry.category}
            </span>
            <AnsweredBadge answered={inquiry.answered} />
            <TimeTypeBadge type={inquiry.timeType} />
            <span className="text-xs text-slate-500 bg-slate-50 rounded-full px-2 py-1">
              {inquiry.source}
            </span>
          </div>
          <DetailRow label="キーワード" value={inquiry.keyword} />
          <DetailRow label="一致したFAQ" value={inquiry.matchedFaq ?? "—"} />
          <DetailRow label="アクション" value={inquiry.action} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}

/* ---------- Helpers ---------- */
import { DEMO_INQUIRIES } from "@/data/demoAnalyticsData";

function getAllInquiries(): DemoInquiry[] {
  return DEMO_INQUIRIES;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
