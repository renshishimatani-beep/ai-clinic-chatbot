import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Database,
  Download,
  Upload,
  AlertTriangle,
  CloudUpload,
  BarChart3,
  Phone,
  CalendarCheck,
  Clock,
  MessageCircle,
  FileText,
  BriefcaseBusiness,
  Menu,
  PanelLeftClose,
  X,
} from "lucide-react";
import type {
  FAQ,
  ClinicInfo,
  ChatSettings,
  ChatMessage,
  UnansweredQuestion,
} from "@/types";
import { storage, uid } from "@/services/storage";
import { upsertClinicInfo } from "@/services/clinicRepository";
import { replaceFaqs } from "@/services/faqRepository";
import { upsertChatSettings } from "@/services/chatSettingsRepository";
import { InquiryAnalytics } from "@/pages/admin/InquiryAnalytics";
import { MonthlyReport } from "@/pages/admin/MonthlyReport";
import {
  DEFAULT_PERIOD,
  calcSummaryWithComparison,
  formatComparison,
  getMonthlyTrend,
  getCategoryBreakdown,
  getHourlyDistribution,
  getWeekdayDistribution,
  getTopQuestions,
  filterInquiries,
} from "@/services/analyticsService";
import { DEMO_INQUIRIES } from "@/data/demoAnalyticsData";
import { DemoDataBadge } from "@/components/analytics/DemoDataBadge";
import { SalesDemoList } from "@/pages/admin/SalesDemoList";
import { SalesDemoEditor } from "@/pages/admin/SalesDemoEditor";
import { SummaryCard } from "@/components/analytics/SummaryCard";
import {
  MonthlyTrendChart,
  CategoryDonutChart,
  HourlyChart,
  WeekdayChart,
} from "@/components/analytics/Charts";

type AdminSection =
  | "dashboard"
  | "clinic"
  | "faqs"
  | "unanswered"
  | "settings"
  | "data"
  | "analytics"
  | "report"
  | "sales-demo";

const NAV: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "ダッシュボード", icon: <LayoutDashboard size={18} /> },
  { id: "analytics", label: "問い合わせ分析", icon: <BarChart3 size={18} /> },
  { id: "report", label: "月次レポート", icon: <FileText size={18} /> },
  { id: "sales-demo", label: "商談デモ", icon: <BriefcaseBusiness size={18} /> },
  { id: "data", label: "データ管理", icon: <Database size={18} /> },
];

const STATUS_LABELS: Record<UnansweredQuestion["status"], string> = {
  unreviewed: "未対応",
  reviewing: "対応中",
  faq_added: "FAQ作成済み",
  ignored: "対応不要",
};

const SIDEBAR_STORAGE_KEY = "tsunamaru_admin_sidebar_open";

function formatDate(iso: string): string {
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

export function AdminPage({
  faqs,
  setFaqs,
  clinicInfo,
  setClinicInfo,
  settings,
  setSettings,
  history,
  unanswered,
  setUnanswered,
  onReset,
  salesDemoId,
  initialSection,
  clinicId,
  headerActions,
}: {
  faqs: FAQ[];
  setFaqs: (f: FAQ[]) => void;
  clinicInfo: ClinicInfo;
  setClinicInfo: (c: ClinicInfo) => void;
  settings: ChatSettings;
  setSettings: (s: ChatSettings) => void;
  history: ChatMessage[];
  unanswered: UnansweredQuestion[];
  setUnanswered: (u: UnansweredQuestion[]) => void;
  onReset: () => void;
  salesDemoId?: string;
  initialSection?: AdminSection;
  clinicId?: string;
  headerActions?: React.ReactNode;
}) {
  const [section, setSection] = useState<AdminSection>(initialSection ?? "dashboard");
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return saved === null ? true : JSON.parse(saved) === true;
    } catch {
      return true;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isDesktopSidebarOpen));
    } catch {
      // 保存領域を利用できない場合も開閉操作自体は維持する。
    }
  }, [isDesktopSidebarOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const updateViewport = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktopViewport(event.matches);
      if (event.matches) setIsMobileSidebarOpen(false);
    };
    updateViewport(media);
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    mobileCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileSidebarOpen]);

  const isSidebarOpen = isDesktopViewport ? isDesktopSidebarOpen : isMobileSidebarOpen;

  function toggleSidebar() {
    if (isDesktopViewport) setIsDesktopSidebarOpen((current) => !current);
    else setIsMobileSidebarOpen((current) => !current);
  }

  function selectSection(next: AdminSection) {
    setSection(next);
    if (!isDesktopViewport) setIsMobileSidebarOpen(false);
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-slate-50">
      {isMobileSidebarOpen && (
        <button type="button" aria-label="サイドバーを閉じる" onClick={() => setIsMobileSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/30 md:hidden" />
      )}

      <aside
        id="admin-sidebar"
        aria-hidden={!isSidebarOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl transition-[width,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:relative md:z-auto md:shadow-none ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        } ${
          isDesktopSidebarOpen
            ? "md:w-60 md:translate-x-0 md:opacity-100 md:pointer-events-auto"
            : "md:w-0 md:-translate-x-full md:opacity-0 md:pointer-events-none md:border-r-0"
        }`}
      >
        <div className="flex w-[280px] items-center justify-between border-b border-slate-200 px-4 py-3 md:hidden">
          <p className="text-sm font-bold text-slate-700">管理メニュー</p>
          <button ref={mobileCloseRef} type="button" onClick={() => setIsMobileSidebarOpen(false)} aria-label="サイドバーを閉じる" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"><X size={20} /></button>
        </div>
        <nav className="flex w-[280px] flex-1 flex-col items-stretch justify-start space-y-1 p-2 md:w-60">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => selectSection(n.id)} className={`focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${section === n.id ? "bg-sky-50 font-semibold text-sky-700" : "text-slate-600 hover:bg-slate-100"}`}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>
        <div className="w-[280px] border-t border-slate-200 p-3 md:w-60">
          <button type="button" onClick={onReset} className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"><RotateCcw size={14} />サンプルデータに戻す</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
        <header className="flex shrink-0 items-center gap-3 bg-white px-5 py-4 border-b border-slate-200">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
            aria-expanded={isSidebarOpen}
            aria-controls="admin-sidebar"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <Menu size={20} />}
          </button>
          <img
            src="/images/tsunamaru/tsunamaru-header-logo-transparent.png"
            alt="つなまるAI"
            className="h-14 min-w-0 max-w-[calc(100%_-_4rem)] object-contain object-left bg-transparent md:h-16 md:max-w-[320px]"
          />
          {headerActions && <div className="ml-auto flex min-w-0 shrink-0 items-center">{headerActions}</div>}
        </header>

        <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white md:hidden">
          <nav className="flex w-max min-w-full items-center justify-start gap-2 p-2">
            {NAV.map((n) => (
              <button key={n.id} type="button" onClick={() => setSection(n.id)} className={`focus-ring flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${section === n.id ? "bg-sky-50 font-semibold text-sky-700" : "text-slate-600"}`}>
                {n.icon}{n.label}
              </button>
            ))}
          </nav>
        </div>

        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-8">
          {section === "dashboard" && <Dashboard unanswered={unanswered} faqs={faqs} />}
          {section === "clinic" && <ClinicSection clinicInfo={clinicInfo} setClinicInfo={setClinicInfo} />}
          {section === "faqs" && <FaqSection faqs={faqs} setFaqs={setFaqs} />}
          {section === "unanswered" && <UnansweredSection unanswered={unanswered} setUnanswered={setUnanswered} onJump={setSection} />}
          {section === "settings" && <SettingsSection settings={settings} setSettings={setSettings} />}
          {section === "analytics" && <InquiryAnalytics />}
          {section === "report" && <MonthlyReport clinicInfo={clinicInfo} />}
          {section === "sales-demo" && (salesDemoId ? <SalesDemoEditor dealId={salesDemoId} /> : <SalesDemoList normalFaqs={faqs} />)}
          {section === "data" && <DataSection faqs={faqs} clinicInfo={clinicInfo} settings={settings} history={history} unanswered={unanswered} clinicId={clinicId} />}
        </main>
      </div>
    </div>
  );
}

/* ---------- Dashboard (Demo Analytics Summary) ---------- */
function Dashboard({
  unanswered,
  faqs,
}: {
  unanswered: UnansweredQuestion[];
  faqs: FAQ[];
}) {
  const stats = useMemo(() => calcSummaryWithComparison(DEFAULT_PERIOD), []);
  const trend = useMemo(() => getMonthlyTrend(DEFAULT_PERIOD, 12), []);
  const filtered = useMemo(() => filterInquiries(DEMO_INQUIRIES, DEFAULT_PERIOD), []);
  const categories = useMemo(() => getCategoryBreakdown(filtered), [filtered]);
  const hourly = useMemo(() => getHourlyDistribution(filtered), [filtered]);
  const weekday = useMemo(() => getWeekdayDistribution(filtered), [filtered]);
  const topQuestions = useMemo(() => getTopQuestions(filtered, 5), [filtered]);

  const cards = [
    {
      label: "問い合わせ総数",
      value: `${stats.total}件`,
      color: "#0EA5E9",
      icon: <MessageCircle size={18} />,
      prevMonth: formatComparison(stats.total, stats.prevMonth?.total),
      prevYear: formatComparison(stats.total, stats.prevYear?.total),
    },
    {
      label: "AI回答数",
      value: `${stats.answered}件`,
      color: "#22C55E",
      icon: <CheckCircle2 size={18} />,
      prevMonth: formatComparison(stats.answered, stats.prevMonth?.answered),
      prevYear: formatComparison(stats.answered, stats.prevYear?.answered),
    },
    {
      label: "回答率",
      value: `${stats.answerRate.toFixed(1)}%`,
      color: "#8B5CF6",
      icon: <BarChart3 size={18} />,
      prevMonth: formatComparison(stats.answerRate, stats.prevMonth?.answerRate),
      prevYear: formatComparison(stats.answerRate, stats.prevYear?.answerRate),
    },
    {
      label: "未回答数",
      value: `${stats.unanswered}件`,
      color: "#F59E0B",
      icon: <XCircle size={18} />,
      prevMonth: formatComparison(stats.unanswered, stats.prevMonth?.unanswered),
      prevYear: formatComparison(stats.unanswered, stats.prevYear?.unanswered),
    },
    {
      label: "休診時間の問い合わせ",
      value: `${stats.outsideHours}件`,
      color: "#EF4444",
      icon: <Clock size={18} />,
      prevMonth: formatComparison(stats.outsideHours, stats.prevMonth?.outsideHours),
      prevYear: formatComparison(stats.outsideHours, stats.prevYear?.outsideHours),
    },
    {
      label: "休診時間問い合わせ率",
      value: `${stats.outsideHoursRate.toFixed(1)}%`,
      color: "#F97316",
      icon: <Clock size={18} />,
      prevMonth: formatComparison(stats.outsideHoursRate, stats.prevMonth?.outsideHoursRate),
      prevYear: formatComparison(stats.outsideHoursRate, stats.prevYear?.outsideHoursRate),
    },
    {
      label: "Web予約クリック",
      value: `${stats.reservationClicks}件`,
      color: "#14B8A6",
      icon: <CalendarCheck size={18} />,
      prevMonth: formatComparison(stats.reservationClicks, stats.prevMonth?.reservationClicks),
      prevYear: formatComparison(stats.reservationClicks, stats.prevYear?.reservationClicks),
    },
    {
      label: "電話クリック",
      value: `${stats.phoneClicks}件`,
      color: "#6366F1",
      icon: <Phone size={18} />,
      prevMonth: formatComparison(stats.phoneClicks, stats.prevMonth?.phoneClicks),
      prevYear: formatComparison(stats.phoneClicks, stats.prevYear?.phoneClicks),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">ダッシュボード</h2>
          <p className="text-sm text-slate-500">
            2026年8月のデモデータに基づくサマリー
          </p>
        </div>
      </div>

      <DemoDataBadge />

      {/* ── Sales hero card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-sky-400 mb-6 shadow-md">
        <div className="relative z-10 px-6 py-7 pr-36 sm:pr-48">
          <p className="text-xs font-semibold text-sky-100 mb-2 tracking-wide">2026年8月・デモデータ</p>
          <p className="text-lg sm:text-xl font-bold text-white leading-snug mb-4">
            電話対応できない時間にも、<br className="sm:hidden" />患者さまは問い合わせています
          </p>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-3xl font-extrabold text-white">214件</p>
              <p className="text-xs text-sky-100 mt-0.5">休診時間の問い合わせ</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-3xl font-extrabold text-white">44.0%</p>
              <p className="text-xs text-sky-100 mt-0.5">全問い合わせの割合</p>
            </div>
          </div>
          <p className="text-sm text-sky-100 max-w-md leading-relaxed">
            診療開始前・昼休診・診療終了後・休診日に発生した問い合わせを、つなまるAIが24時間受け付けています。
          </p>
        </div>
        <img
          src="/images/tsunamaru/tsunamaru-transparent.png"
          alt=""
          aria-hidden="true"
          className="absolute right-0 bottom-0 h-36 sm:h-44 opacity-20 select-none pointer-events-none object-contain object-center bg-transparent"
        />
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <SummaryCard key={c.label} card={c} />
        ))}
      </div>

      {/* ── Three compact insight cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
          <p className="text-base font-bold text-amber-700">44.0%が休診時間の問い合わせ</p>
          <p className="text-sm text-amber-600 mt-1">電話対応できない時間の機会損失を防ぎます</p>
        </div>
        <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4">
          <p className="text-base font-bold text-sky-700">予約に関する問い合わせが最多</p>
          <p className="text-sm text-sky-600 mt-1">患者ニーズを可視化し、予約導線の改善に活用できます</p>
        </div>
        <div className="rounded-2xl bg-green-50 border border-green-100 p-4">
          <p className="text-base font-bold text-green-700">回答率92.0%</p>
          <p className="text-sm text-green-600 mt-1">未回答の質問をFAQに反映し、継続的に精度を改善できます</p>
        </div>
      </div>

      {/* ── Monthly trend ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
        <h3 className="font-semibold text-slate-800 mb-1">月別問い合わせ推移</h3>
        <p className="text-xs text-slate-400 mb-4">直近12ヶ月</p>
        <MonthlyTrendChart data={trend} />
      </div>

      {/* ── Category & Hourly ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-1">問い合わせカテゴリー</h3>
          <p className="text-xs text-slate-400 mb-4">カテゴリー別の内訳</p>
          <CategoryDonutChart data={categories} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-1">時間帯別問い合わせ</h3>
          <p className="text-xs text-slate-400 mb-0">9〜12時・15〜18時が診療時間帯</p>
          <HourlyChart data={hourly} />
        </div>
      </div>

      {/* ── Weekday & Top questions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-1">曜日別問い合わせ</h3>
          <p className="text-xs text-slate-400 mb-4">月〜日（オレンジ=休診日）</p>
          <WeekdayChart data={weekday} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-1">よく聞かれている質問 トップ5</h3>
          <p className="text-xs text-slate-400 mb-4">問い合わせ数と割合</p>
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
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <div className="text-left bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="font-semibold text-slate-800">公開中のFAQ</p>
          <p className="text-2xl font-bold text-sky-600 mt-1">{faqs.filter((f) => f.isPublished).length}</p>
          <p className="text-xs text-slate-400 mt-1">通常FAQの公開件数</p>
        </div>
        <div className="text-left bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="font-semibold text-slate-800">未対応の質問</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {unanswered.filter((u) => u.status === "unreviewed").length}
          </p>
          <p className="text-xs text-slate-400 mt-1">分析対象として保持されています</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Clinic Information ---------- */
const CLINIC_FIELDS: { key: keyof ClinicInfo; label: string; area?: boolean }[] = [
  { key: "clinicName", label: "クリニック名" },
  { key: "doctorName", label: "医師名" },
  { key: "departments", label: "診療科目" },
  { key: "postalCode", label: "郵便番号" },
  { key: "address", label: "住所", area: true },
  { key: "phone", label: "電話番号" },
  { key: "openingHours", label: "診療時間" },
  { key: "closedDays", label: "休診日" },
  { key: "access", label: "アクセス", area: true },
  { key: "parking", label: "駐車場", area: true },
  { key: "reservationUrl", label: "予約URL" },
  { key: "websiteUrl", label: "ウェブサイトURL" },
  { key: "firstVisitRequirements", label: "初診時の持ち物", area: true },
  { key: "paymentMethods", label: "支払い方法", area: true },
  { key: "feverInstructions", label: "発熱時の案内", area: true },
];

function ClinicSection({
  clinicInfo,
  setClinicInfo,
}: {
  clinicInfo: ClinicInfo;
  setClinicInfo: (c: ClinicInfo) => void;
}) {
  const [form, setForm] = useState<ClinicInfo>(clinicInfo);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof ClinicInfo>(key: K, value: ClinicInfo[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function save() {
    setClinicInfo(form);
    setSaved(true);
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800 mb-1">クリニック情報</h2>
      <p className="text-sm text-slate-500 mb-6">患者さま向けチャットに表示される情報です。</p>
      <div className="space-y-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        {CLINIC_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-slate-600 mb-1">{f.label}</label>
            {f.area ? (
              <textarea
                value={form[f.key]}
                onChange={(e) => update(f.key, e.target.value as ClinicInfo[typeof f.key])}
                rows={2}
                className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none"
              />
            ) : (
              <input
                value={form[f.key]}
                onChange={(e) => update(f.key, e.target.value as ClinicInfo[typeof f.key])}
                className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            className="focus-ring rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
          >
            保存する
          </button>
          {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 size={16} /> 保存しました</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------- FAQ Management ---------- */
const CATEGORIES = ["診療時間", "予約", "初診", "アクセス", "駐車場", "発熱", "支払い", "診療内容", "その他"];

const EMPTY_FAQ: FAQ = {
  id: "",
  category: "その他",
  question: "",
  answer: "",
  keywords: [],
  actionType: "none",
  actionLabel: "",
  actionUrl: "",
  isPublished: true,
  updatedAt: "",
};

function FaqSection({ faqs, setFaqs }: { faqs: FAQ[]; setFaqs: (f: FAQ[]) => void }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("すべて");
  const [editing, setEditing] = useState<FAQ | null>(null);

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      if (catFilter !== "すべて" && f.category !== catFilter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [faqs, search, catFilter]);

  function persist(next: FAQ[]) {
    setFaqs(next);
    storage.setFAQs(next);
  }

  function saveFaq(faq: FAQ) {
    const updated = { ...faq, updatedAt: new Date().toISOString() };
    if (faq.id) {
      persist(faqs.map((f) => (f.id === faq.id ? updated : f)));
    } else {
      persist([...faqs, { ...updated, id: uid() }]);
    }
    setEditing(null);
  }

  function deleteFaq(id: string) {
    if (!confirm("このFAQを削除しますか？")) return;
    persist(faqs.filter((f) => f.id !== id));
  }

  function duplicateFaq(f: FAQ) {
    persist([...faqs, { ...f, id: uid(), question: `${f.question}（コピー）`, updatedAt: new Date().toISOString() }]);
  }

  function togglePublish(f: FAQ) {
    persist(faqs.map((x) => (x.id === f.id ? { ...x, isPublished: !x.isPublished } : x)));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">FAQ管理</h2>
          <p className="text-sm text-slate-500">FAQの作成・編集・公開ができます。</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY_FAQ })}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
        >
          <Plus size={16} /> 新規FAQ
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="FAQを検索…"
            className="focus-ring w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option>すべて</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((f) => (
          <div key={f.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-sky-600 bg-sky-50 rounded-full px-2 py-0.5">{f.category}</span>
                  {f.isPublished ? (
                    <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> 公開中</span>
                  ) : (
                    <span className="text-xs text-slate-400 flex items-center gap-1"><XCircle size={12} /> 下書き</span>
                  )}
                </div>
                <p className="font-semibold text-slate-800 mt-1 truncate">{f.question}</p>
                <p className="text-sm text-slate-500 line-clamp-2">{f.answer}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <IconBtn title="編集" onClick={() => setEditing(f)}><Pencil size={14} /></IconBtn>
                <IconBtn title="複製" onClick={() => duplicateFaq(f)}><Copy size={14} /></IconBtn>
                <IconBtn title="公開/非公開" onClick={() => togglePublish(f)}>
                  {f.isPublished ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                </IconBtn>
                <IconBtn title="削除" onClick={() => deleteFaq(f.id)} danger><Trash2 size={14} /></IconBtn>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-8">FAQが見つかりません。</p>}
      </div>

      {editing && <FaqModal faq={editing} onClose={() => setEditing(null)} onSave={saveFaq} />}
    </div>
  );
}

function FaqModal({ faq, onClose, onSave }: { faq: FAQ; onClose: () => void; onSave: (f: FAQ) => void }) {
  const [form, setForm] = useState<FAQ>(faq);
  const [kwText, setKwText] = useState(faq.keywords.join(", "));

  function update<K extends keyof FAQ>(key: K, value: FAQ[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const keywords = kwText.split(",").map((k) => k.trim()).filter(Boolean);
    onSave({ ...form, keywords });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-3">
          <h3 className="font-bold text-slate-800">{faq.id ? "FAQを編集" : "新規FAQ"}</h3>
          <Field label="カテゴリー">
            <select value={form.category} onChange={(e) => update("category", e.target.value)} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="質問">
            <input value={form.question} onChange={(e) => update("question", e.target.value)} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </Field>
          <Field label="回答">
            <textarea value={form.answer} onChange={(e) => update("answer", e.target.value)} rows={4} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
          </Field>
          <Field label="キーワード（カンマ区切り）">
            <input value={kwText} onChange={(e) => setKwText(e.target.value)} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </Field>
          <Field label="アクションの種類">
            <select
              value={form.actionType}
              onChange={(e) => update("actionType", e.target.value as FAQ["actionType"])}
              className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="none">なし</option>
              <option value="phone">電話</option>
              <option value="reservation">予約</option>
              <option value="link">リンク</option>
            </select>
          </Field>
          {form.actionType !== "none" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="アクションのラベル">
                <input value={form.actionLabel || ""} onChange={(e) => update("actionLabel", e.target.value)} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </Field>
              <Field label="アクションURL">
                <input value={form.actionUrl || ""} onChange={(e) => update("actionUrl", e.target.value)} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </Field>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => update("isPublished", e.target.checked)} />
            公開する
          </label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-100">
          <button onClick={onClose} className="focus-ring rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">キャンセル</button>
          <button onClick={submit} className="focus-ring rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">保存</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`focus-ring p-1.5 rounded-md hover:bg-slate-100 ${danger ? "text-red-500 hover:bg-red-50" : "text-slate-500"}`}
    >
      {children}
    </button>
  );
}

/* ---------- Unanswered Questions ---------- */
const STATUSES: UnansweredQuestion["status"][] = ["unreviewed", "reviewing", "faq_added", "ignored"];

function UnansweredSection({
  unanswered,
  setUnanswered,
  onJump,
}: {
  unanswered: UnansweredQuestion[];
  setUnanswered: (u: UnansweredQuestion[]) => void;
  onJump: (s: AdminSection) => void;
}) {
  function persist(next: UnansweredQuestion[]) {
    setUnanswered(next);
    storage.setUnanswered(next);
  }

  function setStatus(id: string, status: UnansweredQuestion["status"]) {
    persist(unanswered.map((u) => (u.id === id ? { ...u, status } : u)));
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">未回答の質問</h2>
      <p className="text-sm text-slate-500 mb-4">チャットボットが回答できなかった質問です。FAQとして追加できます。</p>
      <div className="space-y-2">
        {unanswered.map((u) => (
          <div key={u.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium text-slate-800 break-words">{u.question}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(u.timestamp)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={u.status}
                  onChange={(e) => setStatus(u.id, e.target.value as UnansweredQuestion["status"])}
                  className="focus-ring rounded-lg border border-slate-200 px-2 py-1 text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button
                  onClick={() => onJump("faqs")}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg bg-sky-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-600"
                >
                  <Plus size={12} /> FAQを作成
                </button>
              </div>
            </div>
          </div>
        ))}
        {unanswered.length === 0 && <p className="text-sm text-slate-400 text-center py-8">未回答の質問はありません。</p>}
      </div>
    </div>
  );
}

/* ---------- Chat Settings ---------- */
function SettingsSection({ settings, setSettings }: { settings: ChatSettings; setSettings: (s: ChatSettings) => void }) {
  const [form, setForm] = useState<ChatSettings>(settings);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function save() {
    setSettings(form);
    setSaved(true);
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800 mb-1">チャット設定</h2>
      <p className="text-sm text-slate-500 mb-6">保存すると患者さま向けチャットにすぐ反映されます。</p>
      <div className="space-y-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <Field label="メインカラー">
          <div className="flex items-center gap-2">
            <input type="color" value={form.mainColor} onChange={(e) => update("mainColor", e.target.value)} className="h-10 w-16 rounded border border-slate-200" />
            <input value={form.mainColor} onChange={(e) => update("mainColor", e.target.value)} className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm w-32" />
          </div>
        </Field>
        <Field label="ウェルカムメッセージ">
          <textarea value={form.welcomeMessage} onChange={(e) => update("welcomeMessage", e.target.value)} rows={4} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
        </Field>
        <Field label="免責事項">
          <textarea value={form.disclaimer} onChange={(e) => update("disclaimer", e.target.value)} rows={2} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
        </Field>
        <Field label="フォールバックメッセージ">
          <textarea value={form.fallbackMessage} onChange={(e) => update("fallbackMessage", e.target.value)} rows={3} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.showPhoneButton} onChange={(e) => update("showPhoneButton", e.target.checked)} />
          電話ボタンを表示する
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.showReservationButton} onChange={(e) => update("showReservationButton", e.target.checked)} />
          予約ボタンを表示する
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.showCharacter} onChange={(e) => update("showCharacter", e.target.checked)} />
          キャラクターを表示する
        </label>
        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} className="focus-ring rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">保存</button>
          {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 size={16} /> 保存しました</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Data Management (Backup & Restore) ---------- */
type BackupData = {
  clinicInfo: ClinicInfo;
  faqs: FAQ[];
  settings: ChatSettings;
  history: ChatMessage[];
  unanswered: UnansweredQuestion[];
  statistics: { totalConversations: number; answered: number; unanswered: number };
  dataVersion: string;
};

function todayStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildBackup(
  faqs: FAQ[],
  clinicInfo: ClinicInfo,
  settings: ChatSettings,
  history: ChatMessage[],
  unanswered: UnansweredQuestion[],
): BackupData {
  const userMsgs = history.filter((m) => m.role === "user");
  const answered = userMsgs.filter((m) => m.answered).length;
  return {
    clinicInfo,
    faqs,
    settings,
    history,
    unanswered,
    statistics: {
      totalConversations: userMsgs.length,
      answered,
      unanswered: userMsgs.length - answered,
    },
    dataVersion: "ja-v2",
  };
}

function isValidBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.faqs) &&
    typeof d.clinicInfo === "object" &&
    typeof d.settings === "object" &&
    Array.isArray(d.history) &&
    Array.isArray(d.unanswered) &&
    typeof d.dataVersion === "string"
  );
}

function DataSection({
  faqs,
  clinicInfo,
  settings,
  history,
  unanswered,
  clinicId,
}: {
  faqs: FAQ[];
  clinicInfo: ClinicInfo;
  settings: ChatSettings;
  history: ChatMessage[];
  unanswered: UnansweredQuestion[];
  clinicId?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupData | null>(null);
  const [error, setError] = useState("");
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleExport() {
    const data = buildBackup(faqs, clinicInfo, settings, history, unanswered);
    downloadJson(`tsunamaru-backup-${todayStr()}.json`, data);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isValidBackup(parsed)) {
          setError("有効なつなまるAIのバックアップファイルではありません。");
          return;
        }
        setPending(parsed);
      } catch {
        setError("有効なつなまるAIのバックアップファイルではありません。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleRestore() {
    if (!pending) return;
    const preBackup = buildBackup(
      storage.getFAQs(),
      storage.getClinicInfo(),
      storage.getSettings(),
      storage.getHistory(),
      storage.getUnanswered(),
    );
    downloadJson(`tsunamaru-backup-before-restore-${todayStr()}.json`, preBackup);

    storage.setFAQs(pending.faqs);
    storage.setClinicInfo(pending.clinicInfo);
    storage.setSettings(pending.settings);
    storage.setHistory(pending.history);
    storage.setUnanswered(pending.unanswered);

    setPending(null);
    window.location.reload();
  }

  async function handleMigrate() {
    if (!clinicId) return;
    setMigrating(true);
    setMigrateResult(null);
    try {
      const infoErr = await upsertClinicInfo(clinicId, clinicInfo);
      if (infoErr.error) throw new Error(infoErr.error);

      const faqErr = await replaceFaqs(clinicId, faqs);
      if (faqErr.error) throw new Error(faqErr.error);

      const settingsErr = await upsertChatSettings(clinicId, settings);
      if (settingsErr.error) throw new Error(settingsErr.error);

      setMigrateResult({ ok: true, message: "Supabaseへの移行が完了しました。" });
    } catch (err) {
      setMigrateResult({ ok: false, message: `移行に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}` });
    } finally {
      setMigrating(false);
      setMigrateOpen(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800 mb-1">データ管理</h2>
      <p className="text-sm text-slate-500 mb-6">
        つなまるAIのデータをバックアップ・復元できます。すべての処理はブラウザ内で行われます。
      </p>

      <div className="space-y-4">
        {/* Export */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
              <Download size={20} className="text-sky-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">バックアップ</h3>
              <p className="text-sm text-slate-500 mt-1 mb-3">
                クリニック情報・FAQ・チャット設定・未回答質問・会話履歴をJSONファイルとして書き出します。
              </p>
              <button
                onClick={handleExport}
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-95"
              >
                <Download size={16} />
                バックアップを書き出す
              </button>
            </div>
          </div>
        </div>

        {/* Import */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Upload size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">復元</h3>
              <p className="text-sm text-slate-500 mt-1 mb-3">
                バックアップファイルを選択してデータを復元します。
              </p>

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  復元すると、現在保存されているデータが上書きされます。
                </p>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFile}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
              >
                <Upload size={16} />
                バックアップを復元する
              </button>

              {error && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Migration to Supabase */}
      {clinicId && (
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <CloudUpload size={20} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">Supabaseへ移行</h3>
              <p className="text-sm text-slate-500 mt-1 mb-3">
                クリニック情報・FAQ・チャット設定をSupabaseデータベースに移行します。会話履歴や未回答質問は移行されません。
              </p>
              <button
                onClick={() => setMigrateOpen(true)}
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-95"
              >
                <CloudUpload size={16} />
                ローカルデータをSupabaseへ移行
              </button>
              {migrateResult && (
                <p className={`mt-3 text-sm rounded-lg px-3 py-2 border ${
                  migrateResult.ok
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-red-600 bg-red-50 border-red-200"
                }`}>
                  {migrateResult.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Migration confirmation dialog */}
      {migrateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <CloudUpload size={20} className="text-indigo-500" />
              <h3 className="text-lg font-bold text-slate-800">Supabaseへの移行</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              以下のデータをSupabaseに移行します:
            </p>
            <ul className="text-sm text-slate-600 mb-4 list-disc list-inside space-y-0.5">
              <li>クリニック情報</li>
              <li>FAQ（既存のFAQは置き換えられます）</li>
              <li>チャット設定</li>
            </ul>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              会話履歴・未回答質問・デモデータは移行されません。ローカルデータは削除されません。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setMigrateOpen(false)}
                disabled={migrating}
                className="focus-ring rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="focus-ring rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
              >
                {migrating ? "移行中..." : "移行する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800">復元の確認</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              選択したバックアップファイルのデータで、現在のデータを上書きします。
            </p>
            <p className="text-sm text-slate-600 mb-4">
              復元前に、現在のデータは自動的にバックアップされます。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPending(null)}
                className="focus-ring rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleRestore}
                className="focus-ring rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-95"
              >
                復元する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
