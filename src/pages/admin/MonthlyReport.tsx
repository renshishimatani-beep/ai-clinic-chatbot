import { useMemo, useState } from "react";
import { FileText, Printer, Clock, Lightbulb, TrendingUp } from "lucide-react";
import type { ClinicInfo } from "@/types";
import {
  type PeriodFilter,
  DEFAULT_PERIOD,
  AVAILABLE_YEARS,
  MONTH_LABELS,
  filterInquiries,
  calcSummary,
  getMonthlyTrend,
  getCategoryBreakdown,
  getTopQuestions,
  getUnansweredRanking,
  getTimeTypeBreakdown,
  getOutsideHoursInsights,
  getIncreasingNeeds,
} from "@/services/analyticsService";
import { DEMO_INQUIRIES, DEMO_CATEGORIES } from "@/data/demoAnalyticsData";
import { MonthlyTrendChart, CategoryDonutChart } from "@/components/analytics/Charts";

export function MonthlyReport({ clinicInfo }: { clinicInfo: ClinicInfo }) {
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(7); // August (0-indexed)

  const filter: PeriodFilter = {
    ...DEFAULT_PERIOD,
    year,
    month,
    category: "all",
    answered: "all",
    timeType: "all",
    source: "all",
  };

  const filtered = useMemo(() => filterInquiries(DEMO_INQUIRIES, filter), [year, month]);
  const stats = useMemo(() => calcSummary(filtered), [filtered]);
  const trend = useMemo(() => getMonthlyTrend(filter, 6), [year, month]);
  const categories = useMemo(() => getCategoryBreakdown(filtered), [filtered]);
  const topQuestions = useMemo(() => getTopQuestions(filtered, 5), [filtered]);
  const unanswered = useMemo(() => getUnansweredRanking(filtered, 5), [filtered]);
  const timeTypes = useMemo(() => getTimeTypeBreakdown(filtered), [filtered]);
  const insights = useMemo(() => getOutsideHoursInsights(filtered), [filtered]);
  const increasing = useMemo(() => getIncreasingNeeds(filter), [year, month]);

  const periodLabel = `${year}年${month + 1}月`;
  const todayStr = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const metrics = [
    { label: "問い合わせ総数", value: `${stats.total}件` },
    { label: "AI回答数", value: `${stats.answered}件` },
    { label: "回答率", value: `${stats.answerRate.toFixed(1)}%` },
    { label: "未回答数", value: `${stats.unanswered}件` },
    { label: "休診時間問い合わせ数", value: `${stats.outsideHours}件` },
    { label: "休診時間問い合わせ率", value: `${stats.outsideHoursRate.toFixed(1)}%` },
    { label: "Web予約クリック", value: `${stats.reservationClicks}件` },
    { label: "電話クリック", value: `${stats.phoneClicks}件` },
  ];

  const outsideBreakdown = timeTypes.filter((t) => t.type !== "診療時間内");

  const recommendations = buildRecommendations(categories, stats, increasing, unanswered);

  return (
    <div>
      {/* Controls — hidden in print */}
      <div className="no-print flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">月次レポート</h2>
          <p className="text-sm text-slate-500">
            デモデータ｜実際の運用後にご提供できる月次レポートのイメージです
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-95"
        >
          <Printer size={16} />
          レポートを印刷・PDF保存
        </button>
      </div>

      {/* Period selector — hidden in print */}
      <div className="no-print bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">年</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="focus-ring rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          >
            {AVAILABLE_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">月</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="focus-ring rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          >
            {MONTH_LABELS.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Report canvas ── */}
      <div className="report-page bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b-2 border-sky-500 pb-4 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm text-slate-500">{clinicInfo.clinicName}</p>
              <h1 className="text-2xl font-bold text-slate-800 mt-1">つなまるAI 月次分析レポート</h1>
              <p className="text-sm text-slate-600 mt-1">
                対象期間: {periodLabel}　作成日: {todayStr}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              運用後イメージ
            </span>
          </div>
        </div>

        {/* Executive summary */}
        <div className="report-block rounded-xl bg-sky-50 border border-sky-100 p-5 mb-6">
          <h2 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileText size={18} className="text-sky-600" />
            エグゼクティブサマリー
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            {periodLabel}は<span className="font-bold text-sky-700">{stats.total}件</span>の問い合わせがあり、
            <span className="font-bold text-green-700">{stats.answered}件</span>にAIが回答しました。
            問い合わせの<span className="font-bold text-amber-700">{stats.outsideHoursRate.toFixed(1)}%</span>にあたる
            <span className="font-bold text-amber-700">{stats.outsideHours}件</span>は、
            スタッフさまが電話対応できない時間帯に発生しています。
          </p>
        </div>

        {/* Key metrics */}
        <div className="report-block mb-6">
          <h2 className="font-bold text-slate-800 mb-3">主要指標</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xl font-bold text-slate-800">{m.value}</p>
                <p className="text-xs text-slate-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 1: Monthly trend */}
        <ReportSection title="1. 問い合わせ推移" subtitle="直近6ヶ月">
          <MonthlyTrendChart data={trend} />
        </ReportSection>

        {/* Section 2: Patient needs */}
        <ReportSection title="2. 患者さまの主なニーズ" subtitle="上位5カテゴリー">
          <div className="space-y-2">
            {categories.slice(0, 5).map((c, i) => (
              <div key={c.category} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className="w-6 h-6 rounded-full bg-sky-50 text-sky-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700 flex-1">{c.category}</span>
                <span className="text-sm font-semibold text-slate-800">{c.count}件</span>
                <span className="text-xs text-slate-400 w-12 text-right">{c.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          {categories[0] && (
            <p className="text-xs text-slate-500 mt-3">
              {categories[0].category}に関する問い合わせが最も多く、全体の{categories[0].percentage.toFixed(1)}%を占めています。
            </p>
          )}
        </ReportSection>

        {/* Section 3: Top questions */}
        <ReportSection title="3. よく聞かれた質問" subtitle="上位5質問">
          <div className="space-y-2">
            {topQuestions.map((q, i) => (
              <div key={q.question} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className="w-6 h-6 rounded-full bg-slate-50 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700 flex-1">{q.question}</span>
                <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">{q.count}件</span>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Section 4: Outside-hours */}
        <ReportSection title="4. 休診時間の問い合わせ" subtitle="スタッフが対応できない時間帯の分析">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-2xl font-bold text-amber-600">{stats.outsideHours}</p>
              <p className="text-xs text-slate-500 mt-1">休診時間の問い合わせ</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-2xl font-bold text-amber-600">{stats.outsideHoursRate.toFixed(1)}%</p>
              <p className="text-xs text-slate-500 mt-1">全体に占める割合</p>
            </div>
            <div className="rounded-xl bg-sky-50 border border-sky-100 p-4">
              <p className="text-2xl font-bold text-sky-600">{insights.peakHour}</p>
              <p className="text-xs text-slate-500 mt-1">ピーク時間帯</p>
            </div>
          </div>
          <div className="space-y-2">
            {outsideBreakdown.map((t) => (
              <div key={t.type} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <Clock size={14} className="text-amber-500 shrink-0" />
                <span className="text-sm text-slate-700 flex-1">{t.type}</span>
                <span className="text-sm font-semibold text-slate-800">{t.count}件</span>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Section 5: Unanswered */}
        <ReportSection title="5. 未回答の質問" subtitle="FAQへの追加候補">
          {unanswered.length > 0 ? (
            <div className="space-y-2">
              {unanswered.map((q, i) => {
                const inq = filtered.find((f) => f.question === q.question && !f.answered);
                return (
                  <div key={q.question} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 flex-1">{q.question}</span>
                    <span className="text-xs text-sky-600 bg-sky-50 rounded-full px-2 py-0.5">
                      {inq?.category ?? "その他"}
                    </span>
                    <span className="text-sm font-semibold text-amber-600 whitespace-nowrap">{q.count}件</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">未回答の質問はありません</p>
          )}
        </ReportSection>

        {/* Section 6: Recommendations */}
        <ReportSection title="6. 改善提案" subtitle="データに基づく推奨事項">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recommendations.map((r, i) => (
              <div key={i} className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-sky-600" />
                  <p className="text-sm font-bold text-sky-700">{r.title}</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            {clinicInfo.clinicName}｜つなまるAI 月次分析レポート ({periodLabel})
          </p>
          <p className="text-xs text-slate-400 mt-1">
            このレポートはデモデータに基づく運用後イメージです。
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function ReportSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="report-block mb-6">
      <h2 className="font-bold text-slate-800 mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mb-3">{subtitle}</p>}
      {children}
    </div>
  );
}

type Recommendation = { title: string; text: string };

function buildRecommendations(
  categories: { category: string; count: number; percentage: number }[],
  stats: { unanswered: number; total: number; outsideHours: number; outsideHoursRate: number },
  increasing: { category: string; diff: number }[],
  unanswered: { question: string; count: number }[],
): Recommendation[] {
  const recs: Recommendation[] = [];

  const topCat = categories[0];
  if (topCat) {
    recs.push({
      title: "予約導線改善",
      text: `${topCat.category}に関する問い合わせが多いため、Web予約ボタンをファーストビューで目立たせることを推奨します。`,
    });
  }

  if (stats.outsideHoursRate > 40) {
    recs.push({
      title: "診療時間情報の強調",
      text: `休診時間の問い合わせが${stats.outsideHoursRate.toFixed(0)}%を占めています。チャットの初期メッセージで診療時間を明示することを推奨します。`,
    });
  }

  if (unanswered.length > 0) {
    recs.push({
      title: "FAQ追加",
      text: `未回答の質問が${stats.unanswered}件あります。これらをFAQに追加することで、回答率の改善が見込めます。`,
    });
  }

  const feverTrend = increasing.find((i) => i.category === "発熱");
  if (feverTrend && feverTrend.diff > 5) {
    recs.push({
      title: "発熱案内の見直し",
      text: `発熱に関する問い合わせが前月比${feverTrend.diff.toFixed(0)}%増加しています。受診目安の案内を充実させることを推奨します。`,
    });
  }

  const parkingCat = categories.find((c) => c.category === "駐車場");
  if (parkingCat && parkingCat.count > 15) {
    recs.push({
      title: "駐車場情報の追加",
      text: `駐車場に関する問い合わせが${parkingCat.count}件あります。FAQに駐車場情報を追加することを推奨します。`,
    });
  }

  // Ensure at least 3 recommendations
  while (recs.length < 3) {
    recs.push({
      title: "継続的なFAQ改善",
      text: "未回答の質問を定期的にFAQへ反映し、回答率の継続的な改善を推奨します。",
    });
  }

  return recs.slice(0, 3);
}
