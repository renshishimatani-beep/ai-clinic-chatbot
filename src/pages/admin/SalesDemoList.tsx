import { useMemo, useState } from "react";
import { BookOpen, Copy, ExternalLink, Pencil, Plus, Puzzle, Search, Trash2, X } from "lucide-react";
import type { FAQ, SalesDemoDeal, SalesDemoStatus } from "@/types";
import { createSampleSalesDemoFaqs } from "@/data/salesDemoFaqs";
import {
  createSalesDemoDeal,
  deleteSalesDemoDeal,
  duplicateSalesDemoDeal,
  getSalesDemoDeals,
  normalFaqsToSalesFaqs,
  setActiveSalesDemoDeal,
  updateSalesDemoDeal,
} from "@/services/salesDemoRepository";
import { copyProspectScreenshot, deleteProspectScreenshot } from "@/services/salesDemoScreenshotRepository";
import { createProspectPreviewUrl } from "@/utils/salesDemoShare";
import { stringifyChromeDemoConfig } from "@/utils/chromeDemoConfig";
import { ChromeExtensionGuideDialog } from "@/components/sales-demo/ChromeExtensionGuideDialog";

const STATUS_LABELS: Record<SalesDemoStatus, string> = {
  draft: "下書き",
  scheduled: "商談予定",
  presented: "商談済み",
  won: "受注",
  lost: "失注",
  archived: "下書き",
};

const FILTER_STATUSES: Exclude<SalesDemoStatus, "archived">[] = ["draft", "scheduled", "presented", "won", "lost"];

type SortKey = "updated" | "created" | "scheduled" | "opened";

export function SalesDemoList({ normalFaqs }: { normalFaqs: FAQ[] }) {
  const [deals, setDeals] = useState<SalesDemoDeal[]>(() => getSalesDemoDeals());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Exclude<SalesDemoStatus, "archived">>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [createOpen, setCreateOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  const visibleDeals = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const valueOf = (deal: SalesDemoDeal) => {
      if (sort === "created") return deal.createdAt;
      if (sort === "scheduled") return deal.scheduledAt || "";
      if (sort === "opened") return deal.lastOpenedAt || "";
      return deal.updatedAt;
    };
    return deals
      .filter((deal) => status === "all" || (deal.status === "archived" ? "draft" : deal.status) === status)
      .filter((deal) => !normalized || `${deal.dealName} ${deal.clinicName}`.toLowerCase().includes(normalized))
      .sort((a, b) => valueOf(b).localeCompare(valueOf(a)));
  }, [deals, query, sort, status]);

  function reload() {
    setDeals(getSalesDemoDeals());
  }

  function openEditor(deal: SalesDemoDeal) {
    setActiveSalesDemoDeal(deal.id);
    window.location.hash = `#/admin/sales-demos/${deal.id}`;
  }

  async function createDeal(mode: "sample" | "normal" | "empty", sourceId?: string) {
    try {
      const deal = sourceId
        ? duplicateSalesDemoDeal(sourceId)
        : createSalesDemoDeal({
          faqs: mode === "sample" ? createSampleSalesDemoFaqs() : mode === "normal" ? normalFaqsToSalesFaqs(normalFaqs) : [],
        });
      if (deal) {
        if (sourceId) {
          const source = getSalesDemoDeals().find((item) => item.id === sourceId);
          if (source?.prospectWebsiteScreenshotStorageKey) {
            const storageKey = await copyProspectScreenshot(source.prospectWebsiteScreenshotStorageKey, deal.id);
            if (storageKey) updateSalesDemoDeal(deal.id, { prospectWebsiteScreenshotStorageKey: storageKey });
          }
        }
        openEditor(deal);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "商談デモの作成に失敗しました。");
    }
  }

  async function remove(deal: SalesDemoDeal) {
    if (!confirm("この商談デモを削除しますか？\nこの操作は元に戻せません。")) return;
    if (!deleteSalesDemoDeal(deal.id)) {
      alert("商談デモの削除に失敗しました。");
      return;
    }
    try { await deleteProspectScreenshot(deal.prospectWebsiteScreenshotStorageKey); } catch { /* 商談削除は完了済み */ }
    reload();
  }

  async function duplicate(deal: SalesDemoDeal) {
    const duplicated = duplicateSalesDemoDeal(deal.id);
    if (duplicated) {
      if (deal.prospectWebsiteScreenshotStorageKey) {
        try {
          const storageKey = await copyProspectScreenshot(deal.prospectWebsiteScreenshotStorageKey, duplicated.id);
          if (storageKey) updateSalesDemoDeal(duplicated.id, { prospectWebsiteScreenshotStorageKey: storageKey });
        } catch {
          // 商談本体の複製は維持し、画像だけ再登録できる状態にする。
        }
      }
      openEditor(duplicated);
    }
  }

  function openProspectPreview(deal: SalesDemoDeal) {
    if (!deal.prospectWebsiteUrl.trim()) {
      alert("商談相手のホームページURLが登録されていません。\n編集画面の「商談相手HP」から登録してください。");
      return;
    }
    setActiveSalesDemoDeal(deal.id);
    const baseUrl = window.location.origin + window.location.pathname;
    window.open(`${baseUrl}#/admin/sales-demos/${deal.id}/prospect`, "_blank", "noopener,noreferrer");
  }

  async function copyProspectPreviewUrl(deal: SalesDemoDeal) {
    try {
      await navigator.clipboard.writeText(createProspectPreviewUrl(deal));
      setCopyMessage("商談相手HPプレビューURLをコピーしました。");
      window.setTimeout(() => setCopyMessage(""), 2500);
    } catch {
      alert("商談相手のホームページURLが正しくありません。\n商談デモの編集画面からURLを確認してください。");
    }
  }

  async function copyChromeConfig(deal: SalesDemoDeal) {
    try {
      await navigator.clipboard.writeText(stringifyChromeDemoConfig(deal.id, deal));
      setCopyMessage(`「${deal.dealName}」のChromeデモ設定をコピーしました。`);
      window.setTimeout(() => setCopyMessage(""), 2500);
    } catch {
      alert("Chromeデモ設定をコピーできませんでした。");
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">商談デモ</h2>
          <p className="mt-1 text-sm text-slate-500">商談先クリニックごとに、医院情報・専用FAQ・ホームページプレビューを保存して管理できます。</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><Plus size={16} />新しい商談デモを作成</button>
      </div>

      <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(220px,1fr)_180px_180px]">
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="商談名・クリニック名を検索" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" /></div>
        <select value={status} onChange={(event) => setStatus(event.target.value as "all" | Exclude<SalesDemoStatus, "archived">)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">すべてのステータス</option>{FILTER_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="updated">更新日順</option><option value="created">作成日順</option><option value="scheduled">商談予定日順</option><option value="opened">最終利用日順</option></select>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        <p className="max-w-3xl text-xs leading-relaxed text-slate-600"><strong className="text-sky-800">商談相手HPでの確認</strong>は、まずiframeで実サイトを表示します。iframe表示を制限しているサイトでは、スクリーンショットへ切り替えるか、任意でChrome拡張を利用できます。</p>
        <button type="button" onClick={() => setGuideOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700"><BookOpen size={14} />Chrome拡張の使い方</button>
      </div>
      {copyMessage && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{copyMessage}</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleDeals.map((deal) => (
          <article key={deal.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-800">{deal.dealName}</p><p className="mt-0.5 text-sm text-slate-500">{deal.clinicName || "クリニック名未設定"} · {deal.departments || "診療科未設定"}</p></div><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">{STATUS_LABELS[deal.status]}</span></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-3"><div><dt>商談予定日</dt><dd className="mt-1 text-slate-700">{formatDate(deal.scheduledAt)}</dd></div><div><dt>FAQ</dt><dd className="mt-1 text-slate-700">{deal.faqs.length}件</dd></div><div><dt>最終更新</dt><dd className="mt-1 text-slate-700">{formatDate(deal.updatedAt)}</dd></div><div><dt>最終利用</dt><dd className="mt-1 text-slate-700">{formatDate(deal.lastOpenedAt)}</dd></div><div className="col-span-2"><dt>商談相手HP</dt><dd className="mt-1 truncate text-slate-700">{deal.prospectWebsiteUrl || "未設定"}</dd></div></dl>
            <div className="mt-4 flex flex-wrap items-center gap-2"><Action onClick={() => openProspectPreview(deal)}><ExternalLink size={14} />商談相手HPで確認</Action><Action emphasis onClick={() => void copyProspectPreviewUrl(deal)}><Copy size={14} />共有URLをコピー</Action><Action primary onClick={() => void copyChromeConfig(deal)}><Puzzle size={14} />Chromeデモ設定をコピー</Action><Action onClick={() => openEditor(deal)}><Pencil size={13} />編集</Action><Action onClick={() => duplicate(deal)}><Copy size={13} />複製</Action><Action danger onClick={() => remove(deal)}><Trash2 size={13} />削除</Action></div>
          </article>
        ))}
      </div>
      {!visibleDeals.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">該当する商談デモがありません。</div>}

      {createOpen && <CreateDialog deals={deals} onClose={() => setCreateOpen(false)} onCreate={(mode, sourceId) => { void createDeal(mode, sourceId); }} />}
      {guideOpen && <ChromeExtensionGuideDialog onClose={() => setGuideOpen(false)} />}
    </div>
  );
}

function CreateDialog({ deals, onClose, onCreate }: { deals: SalesDemoDeal[]; onClose: () => void; onCreate: (mode: "sample" | "normal" | "empty", sourceId?: string) => void }) {
  const [sourceId, setSourceId] = useState("");
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4" onClick={onClose}><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h3 className="font-bold text-slate-800">新しい商談デモを作成</h3><button type="button" onClick={onClose} aria-label="閉じる"><X size={18} /></button></div><p className="mt-1 text-sm text-slate-500">初期FAQの作成方法を選択してください。</p><div className="mt-4 grid gap-2"><button type="button" onClick={() => onCreate("sample")} className="rounded-xl border border-sky-200 p-3 text-left text-sm font-semibold text-sky-700 hover:bg-sky-50">サンプルFAQ付きで作成</button><button type="button" onClick={() => onCreate("normal")} className="rounded-xl border border-slate-200 p-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">通常FAQをコピーして作成</button><button type="button" onClick={() => onCreate("empty")} className="rounded-xl border border-slate-200 p-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">空のFAQで作成</button>{deals.length > 0 && <div className="mt-2 rounded-xl border border-slate-200 p-3"><p className="mb-2 text-sm font-semibold text-slate-700">既存の商談デモを複製</p><div className="flex gap-2"><select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="">複製元を選択</option>{deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.dealName}</option>)}</select><button type="button" disabled={!sourceId} onClick={() => onCreate("empty", sourceId)} className="rounded-lg bg-slate-700 px-3 text-sm font-semibold text-white disabled:opacity-40">複製</button></div></div>}</div></div></div>;
}

function Action({ children, onClick, danger, primary, emphasis }: { children: React.ReactNode; onClick: () => void; danger?: boolean; primary?: boolean; emphasis?: boolean }) {
  const colors = primary
    ? "border-sky-600 bg-sky-600 text-white shadow-sm hover:bg-sky-700"
    : emphasis
      ? "border-sky-200 bg-white text-sky-700 shadow-sm hover:bg-sky-50"
      : danger
        ? "border-red-200 text-red-600 hover:bg-red-50"
        : "border-slate-200 text-slate-600 hover:bg-slate-50";
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${colors}`}>{children}</button>;
}

function formatDate(value?: string) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return value; }
}
