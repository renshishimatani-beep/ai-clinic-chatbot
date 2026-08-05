import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FlaskConical,
  Save,
  Upload,
} from "lucide-react";
import type { ClinicInfo, FAQ, SalesDemoSettings } from "@/types";
import { migrateSalesDemoSettings } from "@/services/salesDemoStorage";
import {
  createSharedDemoConfig,
  encodeSharedDemoConfig,
  normalizeProspectWebsiteUrl,
  validateProspectScreenshotUrl,
  validateProspectWebsiteUrl,
} from "@/utils/sharedDemoConfig";
import { matchFAQ, type MatchResult } from "@/utils/faqMatcher";
import { normalizeText } from "@/utils/normalize";
import { fillPlaceholders } from "@/utils/placeholders";
import { checkSafety, EMERGENCY_RESPONSE, MEDICAL_RESPONSE } from "@/utils/safety";
import { FaqCreationSettings } from "@/components/sales-demo/FaqCreationSettings";
import { ProspectScreenshotSettings } from "@/components/sales-demo/ProspectScreenshotSettings";

type Tab = "basic" | "prospect" | "faqs" | "test" | "share";

const TABS: { id: Tab; label: string }[] = [
  { id: "basic", label: "基本情報" },
  { id: "prospect", label: "商談相手HP" },
  { id: "faqs", label: "FAQ作成・設定" },
  { id: "test", label: "回答テスト" },
  { id: "share", label: "共有・プレビュー" },
];

type TestResult = {
  match: MatchResult | null;
  matchedKeyword: string;
  answer: string;
  safety: "emergency" | "medical" | null;
};

export function SalesDemoSettingsPage({
  settings,
  onSave,
  onDirtyChange,
  onDraftChange,
  hideBackup = false,
  onOpenProspectPreview,
  dealId,
  initialTab = "basic",
}: {
  settings: SalesDemoSettings;
  onSave: (settings: SalesDemoSettings) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onDraftChange?: (settings: SalesDemoSettings) => void;
  hideBackup?: boolean;
  onOpenProspectPreview?: () => void;
  dealId?: string;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [form, setForm] = useState<SalesDemoSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [testQuestion, setTestQuestion] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [includeMemo, setIncludeMemo] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => setForm(settings), [settings]);

  function update<K extends keyof SalesDemoSettings>(key: K, value: SalesDemoSettings[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    onDraftChange?.(next);
    setSaved(false);
    setError("");
    onDirtyChange?.(true);
  }

  function normalizedSettings(candidate = form): SalesDemoSettings | null {
    const prospectWebsiteUrl = normalizeProspectWebsiteUrl(candidate.prospectWebsiteUrl);
    const prospectWebsiteScreenshotUrl = normalizeProspectWebsiteUrl(candidate.prospectWebsiteScreenshotUrl);
    if (prospectWebsiteUrl && !validateProspectWebsiteUrl(prospectWebsiteUrl)) {
      setError("商談相手HP URLはhttps://を使用してください。開発時のみlocalhostまたは127.0.0.1のhttp://を利用できます。");
      return null;
    }
    if (prospectWebsiteScreenshotUrl && !validateProspectScreenshotUrl(prospectWebsiteScreenshotUrl)) {
      setError("スクリーンショットURLにはhttps://のURL、またはプロジェクト内の画像パスを入力してください。");
      return null;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(candidate.mainColor)) {
      setError("メインカラーは#から始まる6桁のHEXカラーで入力してください。");
      return null;
    }
    const next = { ...candidate, prospectWebsiteUrl, prospectWebsiteScreenshotUrl };
    setError("");
    return next;
  }

  function saveSettings(candidate = form): SalesDemoSettings | null {
    const next = normalizedSettings(candidate);
    if (!next) return null;
    setForm(next);
    onDraftChange?.(next);
    onSave(next);
    setSaved(true);
    onDirtyChange?.(false);
    return next;
  }

  function commitSettings(candidate: SalesDemoSettings) {
    const next = normalizedSettings(candidate);
    if (!next) return;
    setForm(next);
    onDraftChange?.(next);
    onSave(next);
    setSaved(true);
    onDirtyChange?.(false);
  }

  const clinicInfo = toClinicInfo(form);
  const publicFaqs = useMemo(() => form.faqs.filter((faq) => faq.isPublished), [form.faqs]);
  const testFaqs = publicFaqs;

  function runAnswerTest() {
    const question = testQuestion.trim();
    if (!question) return;
    const safety = checkSafety(question);
    if (safety === "emergency") {
      setTestResult({ match: null, matchedKeyword: "", answer: EMERGENCY_RESPONSE, safety });
      return;
    }
    if (safety === "medical") {
      setTestResult({ match: null, matchedKeyword: "", answer: MEDICAL_RESPONSE, safety });
      return;
    }
    const match = matchFAQ(question, testFaqs);
    const matchedKeyword = match.faq?.keywords.find((keyword) => normalizeText(question).includes(normalizeText(keyword))) || "";
    setTestResult({
      match,
      matchedKeyword,
      answer: match.faq
        ? fillPlaceholders(match.faq.answer, clinicInfo)
        : "こちらの内容は、現在登録されている医院情報からは確認できませんでした。詳しくはクリニックへお問い合わせください。",
      safety: null,
    });
  }

  let shareUrls: ReturnType<typeof buildShareUrls> | null = null;
  let shareError = "";
  try {
    shareUrls = buildShareUrls(form);
  } catch (shareBuildError) {
    shareError = shareBuildError instanceof Error ? shareBuildError.message : "共有URLを生成できませんでした。";
  }

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2_000);
    } catch {
      setError("クリップボードへコピーできませんでした。");
    }
  }

  function openProspectPreview() {
    const next = saveSettings(form);
    if (!next) return;
    if (!next.prospectWebsiteUrl) {
      setError("商談相手HP URLを入力してください。");
      setTab("prospect");
      return;
    }
    if (onOpenProspectPreview) onOpenProspectPreview();
    else window.location.hash = "#/admin/sales-demos";
  }

  function exportSettings() {
    const exportSettings = { ...(includeMemo ? form : { ...form, salesMemo: undefined }), prospectWebsiteScreenshotStorageKey: "" };
    const blob = new Blob([JSON.stringify({ dataVersion: 6, settings: exportSettings }, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    const clinic = (form.clinicName || "clinic").replace(/[\\/:*?"<>|\s]+/g, "-");
    anchor.href = href;
    anchor.download = `tsunamaru-sales-demo-${clinic}-${date}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function importSettings(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const source = isRecord(parsed) && isRecord(parsed.settings) ? parsed.settings : parsed;
      const migrated = migrateSalesDemoSettings(source);
      migrated.prospectWebsiteScreenshotStorageKey = "";
      if (!isRecord(source) || typeof source.salesMemo !== "string") migrated.salesMemo = form.salesMemo;
      setForm(migrated);
      onSave(migrated);
      setSaved(true);
      setError("");
    } catch {
      setError("商談設定ファイルを読み込めませんでした。JSON形式を確認してください。");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">商談デモ設定</h2>
        <p className="mt-1 text-sm text-slate-500">商談先クリニック専用の医院情報、FAQ、ホームページプレビューを設定できます。この設定は通常のクリニック情報には影響しません。</p>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {tab === "basic" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-800">商談先クリニックの基本情報</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="商談先クリニック名" value={form.clinicName} onChange={(value) => update("clinicName", value)} />
              <TextField label="院長名" value={form.doctorName} onChange={(value) => update("doctorName", value)} />
              <TextField label="診療科" value={form.departments} onChange={(value) => update("departments", value)} />
              <TextField label="電話番号" value={form.phone} onChange={(value) => update("phone", value)} />
              <TextField label="郵便番号" value={form.postalCode} onChange={(value) => update("postalCode", value)} />
              <TextField label="住所" value={form.address} onChange={(value) => update("address", value)} />
              <TextField label="診療時間" value={form.openingHours} onChange={(value) => update("openingHours", value)} area />
              <TextField label="受付時間" value={form.receptionHours} onChange={(value) => update("receptionHours", value)} area />
              <TextField label="休診日" value={form.closedDays} onChange={(value) => update("closedDays", value)} area />
              <TextField label="アクセス" value={form.access} onChange={(value) => update("access", value)} area />
              <TextField label="駐車場" value={form.parking} onChange={(value) => update("parking", value)} area />
              <TextField label="Web予約URL" value={form.reservationUrl} onChange={(value) => update("reservationUrl", value)} />
              <TextField label="公式サイトURL" value={form.websiteUrl} onChange={(value) => update("websiteUrl", value)} />
              <TextField label="支払い方法" value={form.paymentMethods} onChange={(value) => update("paymentMethods", value)} area />
              <TextField label="診療内容" value={form.medicalServices} onChange={(value) => update("medicalServices", value)} area />
              <TextField label="検査" value={form.examinations} onChange={(value) => update("examinations", value)} area />
              <TextField label="健康診断" value={form.healthCheckups} onChange={(value) => update("healthCheckups", value)} area />
              <TextField label="予防接種" value={form.vaccinations} onChange={(value) => update("vaccinations", value)} area />
              <TextField label="発熱時の案内" value={form.feverInstructions} onChange={(value) => update("feverInstructions", value)} area />
              <TextField label="初診時の持ち物" value={form.firstVisitItems} onChange={(value) => update("firstVisitItems", value)} area />
              <Field label="メインカラー">
                <div className="flex gap-2">
                  <input type="color" value={form.mainColor} onChange={(event) => update("mainColor", event.target.value)} className="h-10 w-14 rounded-lg border border-slate-200" />
                  <input value={form.mainColor} onChange={(event) => update("mainColor", event.target.value)} className="focus-ring min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </Field>
              <TextField label="ロゴ画像URL" value={form.logoUrl} onChange={(value) => update("logoUrl", value)} />
              <div className="sm:col-span-2">
                <TextField label="商談担当者メモ（内部用・共有URLには含まれません）" value={form.salesMemo} onChange={(value) => update("salesMemo", value)} area />
              </div>
            </div>
            <SaveButton saved={saved} onClick={() => saveSettings()} />
          </section>
          <ClinicPreview form={form} />
        </div>
      )}

      {tab === "prospect" && (
        <section className="max-w-3xl rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-800">商談相手HP</h3>
          <p className="mb-5 mt-1 text-sm text-slate-500">商談相手HP URLを登録すると、まずiframeで実サイトを表示し、その上につなまるAIを重ねて確認できます。</p>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><p className="text-sm font-bold text-sky-800">1. iframeで実サイトを確認</p><p className="mt-1 text-xs leading-relaxed text-slate-600">iframe表示できるHPは、URLだけで実サイト上の表示を確認できます。</p></div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-800">2. 表示制限時の代替</p><p className="mt-1 text-xs leading-relaxed text-slate-600">iframe禁止サイトではスクリーンショットへ切り替え、必要な場合だけChrome拡張を利用します。</p></div>
          </div>
          <div className="space-y-4">
            <TextField label="商談相手HP URL" value={form.prospectWebsiteUrl} onChange={(value) => update("prospectWebsiteUrl", value)} placeholder="https://example-clinic.jp" />
            <TextField label="プレビュー用サイト名（任意）" value={form.prospectWebsiteName} onChange={(value) => update("prospectWebsiteName", value)} />
            <Field label="プレビュー表示モード">
              <div className="flex flex-wrap gap-2">
                {([['auto', '自動（iframe優先）'], ['iframe', 'iframe固定'], ['screenshot', 'スクリーンショット']] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => update('prospectPreviewMode', value)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${form.prospectPreviewMode === value ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600'}`}>{label}</button>
                ))}
              </div>
            </Field>
            <TextField label="公開用スクリーンショット画像URL（任意）" value={form.prospectWebsiteScreenshotUrl} onChange={(value) => update("prospectWebsiteScreenshotUrl", value)} placeholder="https://… または /images/…" />
            {dealId && <ProspectScreenshotSettings
              dealId={dealId}
              storageKey={form.prospectWebsiteScreenshotStorageKey}
              publicUrl={form.prospectWebsiteScreenshotUrl}
              onStored={(storageKey) => commitSettings({ ...form, prospectWebsiteScreenshotStorageKey: storageKey })}
              onDelete={() => commitSettings({ ...form, prospectWebsiteScreenshotStorageKey: '', prospectWebsiteScreenshotUrl: '', prospectPreviewMode: 'auto' })}
            />}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <SaveButton saved={saved} onClick={() => saveSettings()} inline />
            <button type="button" onClick={openProspectPreview} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><ExternalLink size={16} />商談相手HPで確認</button>
          </div>
        </section>
      )}

      {tab === "faqs" && <FaqCreationSettings settings={form} onCommit={commitSettings} />}

      {tab === "test" && (
        <section className="max-w-3xl rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-slate-800"><FlaskConical size={18} className="text-sky-500" />回答テスト</h3>
          <p className="mb-4 mt-1 text-sm text-slate-500">患者さまからの質問を入力し、現在の登録済みFAQでどのように回答されるか確認できます。</p>
          <div className="flex gap-2">
            <input value={testQuestion} onChange={(event) => setTestQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runAnswerTest(); }} placeholder="例：診療時間を教えてください" className="focus-ring min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button type="button" onClick={runAnswerTest} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">回答テスト</button>
          </div>
          {testResult && (
            <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <ResultRow label="一致したFAQ" value={testResult.match?.faq?.question || (testResult.safety ? "医療安全回答" : "一致なし")} />
              <ResultRow label="一致方法" value={testResult.safety || testResult.match?.method || "fallback"} />
              <ResultRow label="一致したキーワード" value={testResult.matchedKeyword || "—"} />
              <div><p className="mb-1 text-xs font-semibold text-slate-500">表示される回答</p><p className="whitespace-pre-wrap rounded-lg bg-white p-3 text-slate-700">{testResult.answer}</p></div>
              <ResultRow label="表示されるアクション" value={formatAction(testResult.match?.faq, form)} />
            </div>
          )}
        </section>
      )}

      {tab === "share" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
            <h3 className="font-bold text-slate-800">共有・プレビュー</h3>
            <p className="mt-1 text-sm text-slate-600">共有用URLには公開可能な医院情報と公開中の登録済みFAQだけが含まれます。商談担当者メモや管理・認証情報は含まれません。</p>
            {shareError && <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-red-600">{shareError}</p>}
            {!form.prospectWebsiteScreenshotUrl && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">iframe表示が制限されるサイトに備える場合は、代替用の公開スクリーンショットURLを登録してください。{form.prospectWebsiteScreenshotStorageKey ? " 現在の画像はこの端末内にのみ保存されています。" : ""}</p>
            )}
            {shareUrls && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {shareUrls.prospect && <div className="md:col-span-2">
                  <ShareCard label="商談相手HPプレビュー" copyLabel="商談相手HPプレビューURLをコピー" openLabel="商談相手HPで確認" value={shareUrls.prospect} copied={copied === "prospect"} onCopy={() => {
                    if (!form.prospectWebsiteUrl.trim()) {
                      setError("商談相手のホームページURLが登録されていません。編集画面の「商談相手HP」から登録してください。");
                      setTab("prospect");
                      return;
                    }
                    if (shareUrls?.prospect) void copyValue("prospect", shareUrls.prospect);
                  }} onOpen={() => {
                    if (!form.prospectWebsiteUrl.trim()) {
                      setError("商談相手のホームページURLが登録されていません。編集画面の「商談相手HP」から登録してください。");
                      setTab("prospect");
                      return;
                    }
                    if (shareUrls?.prospect) window.open(shareUrls.prospect, "_blank", "noopener,noreferrer");
                  }} />
                </div>}
                <ShareCard label="埋め込みプレビュー" copyLabel="埋め込みURLをコピー" openLabel="埋め込みプレビューを開く" value={shareUrls.embed} copied={copied === "embed"} onCopy={() => copyValue("embed", shareUrls!.embed)} onOpen={() => window.open(shareUrls!.embed, "_blank", "noopener,noreferrer")} />
                <ShareCard label="iframeコード" copyLabel="iframeコードをコピー" value={shareUrls.iframe} copied={copied === "iframe"} onCopy={() => copyValue("iframe", shareUrls!.iframe)} />
              </div>
            )}
          </div>

          {!hideBackup && <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-800">商談設定の書き出し・読み込み</h3>
            <p className="mt-1 text-sm text-slate-500">医院情報、表示設定、商談相手HP、商談専用FAQをJSONで保存できます。認証情報やSupabase情報は含まれません。</p>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={includeMemo} onChange={(event) => setIncludeMemo(event.target.checked)} />商談担当者メモを含める</label>
            <div className="mt-3 flex flex-wrap gap-2">
              <SmallButton onClick={exportSettings}><Download size={15} />商談設定を書き出す</SmallButton>
              <SmallButton onClick={() => importRef.current?.click()}><Upload size={15} />商談設定を読み込む</SmallButton>
              <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSettings(file); }} />
            </div>
          </div>}
        </section>
      )}

    </div>
  );
}

function toClinicInfo(settings: SalesDemoSettings): ClinicInfo {
  return {
    clinicName: settings.clinicName,
    doctorName: settings.doctorName,
    departments: settings.departments,
    postalCode: settings.postalCode,
    phone: settings.phone,
    address: settings.address,
    openingHours: settings.openingHours,
    receptionHours: settings.receptionHours,
    closedDays: settings.closedDays,
    access: settings.access,
    parking: settings.parking,
    reservationUrl: settings.reservationUrl,
    websiteUrl: settings.websiteUrl,
    firstVisitRequirements: settings.firstVisitItems,
    paymentMethods: settings.paymentMethods,
    medicalServices: settings.medicalServices,
    examinations: settings.examinations,
    healthCheckups: settings.healthCheckups,
    vaccinations: settings.vaccinations,
    feverInstructions: settings.feverInstructions,
  };
}

function buildShareUrls(settings: SalesDemoSettings) {
  // 共有ページでは通常FAQへフォールバックせず、この商談の公開FAQだけを含める。
  const encoded = encodeSharedDemoConfig(createSharedDemoConfig(settings, []));
  const base = window.location.origin + window.location.pathname;
  const embed = `${base}#/shared-demo/embed?config=${encodeURIComponent(encoded)}`;
  const prospect = settings.prospectWebsiteUrl.trim() ? `${base}#/shared-demo/prospect?config=${encodeURIComponent(encoded)}` : null;
  const iframe = `<iframe\n  src="${embed}"\n  title="つなまるAI"\n  style="position:fixed;right:0;bottom:0;width:440px;height:760px;border:0;z-index:9999;background:transparent;"\n  allow="clipboard-write"\n></iframe>`;
  return { embed, prospect, iframe };
}

function formatAction(faq: FAQ | null | undefined, settings: SalesDemoSettings): string {
  if (!faq || faq.actionType === "none") return "なし";
  if (faq.actionType === "phone") return `${faq.actionLabel || "クリニックに電話する"}（tel:${settings.phone}）`;
  if (faq.actionType === "reservation") return `${faq.actionLabel || "Web予約"}（${settings.reservationUrl}）`;
  return `${faq.actionLabel || "公式サイトで確認する"}（${faq.actionUrl || settings.websiteUrl}）`;
}

function ClinicPreview({ form }: { form: SalesDemoSettings }) {
  return <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-400">簡易プレビュー</p><div className="mt-3 flex items-center gap-3">{form.logoUrl ? <img src={form.logoUrl} alt="" className="h-12 w-12 rounded-xl object-contain" /> : <span className="h-12 w-12 rounded-xl" style={{ backgroundColor: form.mainColor }} />}<div className="min-w-0"><p className="truncate font-bold text-slate-800">{form.clinicName || "クリニック名"}</p><p className="truncate text-xs text-slate-500">{form.departments || "診療科"}</p></div></div><div className="mt-4 space-y-2 text-sm text-slate-600"><p>{form.phone || "電話番号"}</p><p>{form.postalCode && `〒${form.postalCode} `}{form.address || "住所"}</p><p>{form.openingHours || "診療時間"}</p></div><span className="mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: form.mainColor }}>Web予約</span></aside>;
}

function TextField({ label, value, onChange, area, placeholder }: { label: string; value: string; onChange: (value: string) => void; area?: boolean; placeholder?: string }) {
  return <Field label={label}>{area ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className="focus-ring w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm" /> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />}</Field>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>{children}</label>;
}

function SaveButton({ saved, onClick, inline }: { saved: boolean; onClick: () => void; inline?: boolean }) {
  return <button type="button" onClick={onClick} className={`${inline ? "" : "mt-5"} inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600`}>{saved ? <Check size={16} /> : <Save size={16} />}{saved ? "保存しました" : "設定を保存"}</button>;
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">{children}</button>;
}


function ShareCard({ label, copyLabel, openLabel, value, copied, onCopy, onOpen }: { label: string; copyLabel: string; openLabel?: string; value: string; copied: boolean; onCopy: () => void; onOpen?: () => void }) {
  return <div className="rounded-xl border border-sky-100 bg-white p-3"><p className="text-sm font-semibold text-slate-700">{label}</p><input readOnly value={value} className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-500" /><div className="mt-2 flex gap-2"><button type="button" onClick={onCopy} className="inline-flex items-center gap-1 rounded-lg border border-sky-200 px-2.5 py-1.5 text-xs font-semibold text-sky-700">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "コピーしました" : copyLabel}</button>{onOpen && <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white"><ExternalLink size={13} />{openLabel || "開く"}</button>}</div></div>;
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 sm:grid-cols-[160px_1fr]"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-slate-700">{value}</p></div>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
