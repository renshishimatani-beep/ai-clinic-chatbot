import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Copy, Download, Puzzle, Save, Trash2, Upload } from "lucide-react";
import type { SalesDemoDeal, SalesDemoSettings, SalesDemoStatus } from "@/types";
import { SalesDemoSettingsPage } from "@/pages/admin/SalesDemoSettingsPage";
import { migrateSalesDemoSettings } from "@/services/salesDemoStorage";
import {
  createSalesDemoDeal,
  deleteSalesDemoDeal,
  duplicateSalesDemoDeal,
  getSalesDemoDeal,
  salesDemoDealToSettings,
  salesDemoSettingsToDealFields,
  setActiveSalesDemoDeal,
  updateSalesDemoDeal,
} from "@/services/salesDemoRepository";
import { copyProspectScreenshot, deleteProspectScreenshot } from "@/services/salesDemoScreenshotRepository";
import { stringifyChromeDemoConfig } from "@/utils/chromeDemoConfig";
import { ChromeExtensionGuideDialog } from "@/components/sales-demo/ChromeExtensionGuideDialog";

const STATUS_LABELS: Record<Exclude<SalesDemoStatus, "archived">, string> = { draft: "下書き", scheduled: "商談予定", presented: "商談済み", won: "受注", lost: "失注" };

export function SalesDemoEditor({ dealId }: { dealId: string }) {
  const initial = getSalesDemoDeal(dealId);
  const [deal, setDeal] = useState<SalesDemoDeal | null>(initial);
  const [draftSettings, setDraftSettings] = useState<SalesDemoSettings | null>(initial ? salesDemoDealToSettings(initial) : null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [includeMemo, setIncludeMemo] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [chromeCopyMessage, setChromeCopyMessage] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const opened = setActiveSalesDemoDeal(dealId);
    setDeal(opened);
    setDraftSettings(opened ? salesDemoDealToSettings(opened) : null);
    setDirty(false);
    setSaveState("idle");
  }, [dealId]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  if (!deal || !draftSettings) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"><p className="font-semibold text-amber-800">指定された商談デモが見つかりません。</p><button type="button" onClick={() => { window.location.hash = "#/admin/sales-demos"; }} className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white">一覧に戻る</button></div>;
  }

  function updateMeta<K extends keyof SalesDemoDeal>(key: K, value: SalesDemoDeal[K]) {
    setDeal((current) => current ? { ...current, [key]: value } : current);
    setDirty(true);
    setSaveState("idle");
  }

  function save(settings = draftSettings) {
    if (!deal || !settings) return null;
    setSaveState("saving");
    try {
      const updated = updateSalesDemoDeal(deal.id, { ...deal, ...salesDemoSettingsToDealFields(settings) });
      if (!updated) throw new Error();
      setDeal(updated);
      setDraftSettings(salesDemoDealToSettings(updated));
      setDirty(false);
      setSaveState("saved");
      return updated;
    } catch {
      setSaveState("error");
      return null;
    }
  }

  function goBack() {
    if (dirty && !confirm("保存されていない変更があります。このまま移動しますか？")) return;
    window.location.hash = "#/admin/sales-demos";
  }

  async function duplicate() {
    if (!deal) return;
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
      window.location.hash = `#/admin/sales-demos/${duplicated.id}`;
    }
  }

  async function remove() {
    if (!deal) return;
    if (!confirm("この商談デモを削除しますか？\nこの操作は元に戻せません。")) return;
    if (deleteSalesDemoDeal(deal.id)) {
      try { await deleteProspectScreenshot(deal.prospectWebsiteScreenshotStorageKey); } catch { /* 商談削除は完了済み */ }
      window.location.hash = "#/admin/sales-demos";
    }
    else setSaveState("error");
  }

  function exportDeal() {
    if (!deal) return;
    const exportValue = { ...(includeMemo ? deal : { ...deal, internalMemo: undefined }), prospectWebsiteScreenshotStorageKey: "" };
    const blob = new Blob([JSON.stringify({ dataVersion: 1, deal: exportValue }, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `tsunamaru-sales-demo-${(deal.clinicName || "clinic").replace(/[\\/:*?"<>|\s]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function copyChromeConfig() {
    if (!deal || !draftSettings) return;
    try {
      await navigator.clipboard.writeText(stringifyChromeDemoConfig(deal.id, draftSettings));
      setChromeCopyMessage("Chromeデモ設定をコピーしました。");
      window.setTimeout(() => setChromeCopyMessage(""), 2500);
    } catch {
      setChromeCopyMessage("Chromeデモ設定をコピーできませんでした。");
    }
  }

  async function importAsNew(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const record = isRecord(parsed) && isRecord(parsed.deal) ? parsed.deal : parsed;
      const settingsSource = isRecord(record) && isRecord(record.settings) ? record.settings : record;
      const settings = migrateSalesDemoSettings(settingsSource);
      const imported = createSalesDemoDeal({
        ...salesDemoSettingsToDealFields(settings),
        prospectWebsiteScreenshotStorageKey: "",
        dealName: isRecord(record) && typeof record.dealName === "string" ? `${record.dealName}（読み込み）` : `${settings.clinicName || "読み込み"} 商談デモ`,
        status: isRecord(record) && isStatus(record.status) ? record.status : "draft",
        scheduledAt: isRecord(record) && typeof record.scheduledAt === "string" ? record.scheduledAt : undefined,
        internalMemo: isRecord(record) && typeof record.internalMemo === "string" ? record.internalMemo : settings.salesMemo,
      });
      window.location.hash = `#/admin/sales-demos/${imported.id}`;
    } catch {
      alert("商談設定ファイルを読み込めませんでした。JSON形式を確認してください。");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={goBack} className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft size={16} />一覧に戻る</button><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyChromeConfig()} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white"><Puzzle size={15} />Chromeデモ設定をコピー</button><button type="button" onClick={() => setGuideOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-sky-700"><BookOpen size={15} />Chrome拡張の使い方</button><button type="button" onClick={() => save()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><Save size={15} />保存</button><button type="button" onClick={duplicate} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"><Copy size={15} />複製</button><button type="button" onClick={remove} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600"><Trash2 size={15} />削除</button></div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_220px]"><label className="text-xs font-semibold text-slate-500">商談名<input value={deal.dealName} onChange={(event) => updateMeta("dealName", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800" /></label><label className="text-xs font-semibold text-slate-500">ステータス<select value={deal.status === "archived" ? "draft" : deal.status} onChange={(event) => updateMeta("status", event.target.value as SalesDemoStatus)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">商談予定日<input type="datetime-local" value={toLocalDateTime(deal.scheduledAt)} onChange={(event) => updateMeta("scheduledAt", event.target.value ? new Date(event.target.value).toISOString() : undefined)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><p>{deal.clinicName || "クリニック名未設定"} · 最終保存 {new Date(deal.updatedAt).toLocaleString("ja-JP")}</p><p>{saveState === "saving" ? "保存中…" : saveState === "saved" ? "商談デモを保存しました。" : saveState === "error" ? "商談デモの保存に失敗しました。" : dirty ? "未保存の変更があります" : "保存済み"}</p></div>
        {chromeCopyMessage && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{chromeCopyMessage}</p>}
        <p className="mt-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-slate-600">商談相手HPはまずiframeで確認します。表示が制限される場合はスクリーンショットへ切り替え、Chrome拡張は実サイト上で確認する任意機能として利用できます。</p>
      </div>

      <SalesDemoSettingsPage dealId={deal.id} initialTab={getInitialTab()} settings={draftSettings} onSave={(settings) => { setDraftSettings(settings); save(settings); }} onDraftChange={setDraftSettings} onDirtyChange={setDirty} onOpenProspectPreview={() => { window.location.hash = `#/admin/sales-demos/${deal.id}/prospect`; }} hideBackup />

      <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-800">商談設定の書き出し・読み込み</h3><p className="mt-1 text-sm text-slate-500">読み込んだ商談は、現在の商談を上書きせず新しい商談として追加します。</p><label className="mt-3 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={includeMemo} onChange={(event) => setIncludeMemo(event.target.checked)} />内部メモを含める</label><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={exportDeal} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"><Download size={15} />商談設定を書き出す</button><button type="button" onClick={() => importRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"><Upload size={15} />商談設定を読み込む</button><input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importAsNew(file); }} /></div></section>
      {guideOpen && <ChromeExtensionGuideDialog onClose={() => setGuideOpen(false)} />}
    </div>
  );
}

function toLocalDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is SalesDemoStatus {
  return typeof value === "string" && ["draft", "scheduled", "presented", "won", "lost"].includes(value);
}

function getInitialTab(): "basic" | "prospect" {
  const [, query = ""] = window.location.hash.slice(1).split("?", 2);
  return new URLSearchParams(query).get("tab") === "prospect" ? "prospect" : "basic";
}
