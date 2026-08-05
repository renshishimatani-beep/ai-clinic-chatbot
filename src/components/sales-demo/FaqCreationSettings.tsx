import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Copy, ExternalLink, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import type { ImportedClinicInfo, ImportedFAQ, SalesDemoFAQ, SalesDemoSettings } from "@/types";
import { uid } from "@/services/storage";
import { generateExternalFaqPrompt, normalizeQuestionForDuplicate, parseImportedWebsiteResult } from "@/utils/externalFaqWorkflow";

const CATEGORIES = ["診療時間", "予約", "初診", "診療内容", "アクセス", "駐車場", "発熱", "検査", "健康診断", "予防接種", "支払い", "問い合わせ", "その他"];
const EMPTY_FAQ: SalesDemoFAQ = { id: "", category: "その他", question: "", answer: "", keywords: [], actionType: "none", actionLabel: "", actionUrl: "", isPublished: true, sortOrder: 0, updatedAt: "", origin: "manual" };
type DuplicateAction = "keep" | "replace" | "both" | "exclude";
const CLINIC_FIELDS: { key: keyof ImportedClinicInfo; label: string }[] = [
  { key: "clinicName", label: "クリニック名" }, { key: "doctorName", label: "院長名" }, { key: "departments", label: "診療科" },
  { key: "phone", label: "電話番号" }, { key: "postalCode", label: "郵便番号" }, { key: "address", label: "住所" },
  { key: "openingHours", label: "診療時間" }, { key: "receptionHours", label: "受付時間" }, { key: "closedDays", label: "休診日" },
  { key: "access", label: "アクセス" }, { key: "parking", label: "駐車場" }, { key: "reservationUrl", label: "Web予約URL" },
  { key: "websiteUrl", label: "公式サイトURL" }, { key: "paymentMethods", label: "支払い方法" }, { key: "medicalServices", label: "診療内容" },
  { key: "examinations", label: "検査" }, { key: "healthCheckups", label: "健康診断" }, { key: "vaccinations", label: "予防接種" },
  { key: "feverInstructions", label: "発熱時の案内" }, { key: "firstVisitItems", label: "初診時の持ち物" },
];

export function FaqCreationSettings({ settings, onCommit }: { settings: SalesDemoSettings; onCommit: (settings: SalesDemoSettings) => void }) {
  const [importError, setImportError] = useState("");
  const [notice, setNotice] = useState("");
  const [duplicateActions, setDuplicateActions] = useState<Record<string, DuplicateAction>>({});
  const [editingFaq, setEditingFaq] = useState<SalesDemoFAQ | null>(null);
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategory, setFaqCategory] = useState("すべて");
  const [selectedClinicFields, setSelectedClinicFields] = useState<Partial<Record<keyof ImportedClinicInfo, boolean>>>({});

  const registeredFaqs = useMemo(() => [...settings.faqs].sort((a, b) => a.sortOrder - b.sortOrder), [settings.faqs]);
  const filteredFaqs = useMemo(() => {
    const query = faqSearch.trim().toLowerCase();
    return registeredFaqs.filter((faq) => {
      if (faqCategory !== "すべて" && faq.category !== faqCategory) return false;
      return !query || `${faq.question} ${faq.answer} ${faq.keywords.join(" ")}`.toLowerCase().includes(query);
    });
  }, [faqCategory, faqSearch, registeredFaqs]);

  function commit(patch: Partial<SalesDemoSettings>) {
    onCommit({ ...settings, ...patch });
  }

  function generatePrompt() {
    if (!settings.prospectWebsiteUrl.trim()) { setNotice("商談相手のホームページURLを先に登録してください。"); return; }
    const prompt = generateExternalFaqPrompt(settings);
    commit({ generatedFaqPrompt: prompt });
    setNotice("AI用プロンプトを作成しました。");
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(settings.generatedFaqPrompt);
      setNotice("AI用プロンプトをコピーしました。ブラウジング可能なChatGPTまたはGeminiへ貼り付けてください。");
    } catch { setNotice("AI用プロンプトをコピーできませんでした。"); }
  }

  function loadCandidates() {
    try {
      const result = parseImportedWebsiteResult(settings.lastImportedAiResponse);
      if (result.websiteAccessStatus === "failed") {
        setImportError("外部AIが公式ホームページを確認できませんでした。Webサイトを閲覧できる設定のChatGPTまたはGeminiを使用して、もう一度お試しください。");
        return;
      }
      commit({ importedClinicInfoCandidate: result.clinicInfo, importedFaqCandidates: result.faqs, importedSourcePages: result.sourcePages });
      setSelectedClinicFields({});
      setImportError(""); setNotice(`基本情報候補と${result.faqs.length}件のFAQ候補を読み込みました。`);
    } catch {
      setImportError("データを読み込めませんでした。ChatGPT・Geminiの回答が、指定されたJSON形式になっているか確認してください。");
    }
  }

  function clinicPatch(): Partial<SalesDemoSettings> {
    return CLINIC_FIELDS.reduce<Partial<SalesDemoSettings>>((patch, field) => {
      const value = settings.importedClinicInfoCandidate[field.key];
      if (value && (selectedClinicFields[field.key] ?? true)) (patch as Record<string, string>)[field.key] = value;
      return patch;
    }, {});
  }

  function applySelectedClinicInfo() {
    const patch = clinicPatch();
    commit(patch);
    setNotice(Object.keys(patch).length ? "選択した基本情報を反映しました。" : "反映する基本情報を選択してください。");
  }

  function updateCandidate(id: string, patch: Partial<ImportedFAQ>) {
    commit({ importedFaqCandidates: settings.importedFaqCandidates.map((candidate) => candidate.id === id ? { ...candidate, ...patch } : candidate) });
  }

  function duplicateOf(candidate: ImportedFAQ): SalesDemoFAQ | undefined {
    const normalized = normalizeQuestionForDuplicate(candidate.question);
    return settings.faqs.find((faq) => {
      if (normalizeQuestionForDuplicate(faq.question) === normalized) return true;
      const candidateKeywords = new Set(candidate.keywords.map(normalizeQuestionForDuplicate));
      const shared = faq.keywords.filter((keyword) => candidateKeywords.has(normalizeQuestionForDuplicate(keyword))).length;
      return candidateKeywords.size > 0 && shared / candidateKeywords.size >= 0.6;
    });
  }

  function excludeDuplicates() {
    const seen = new Set(settings.faqs.map((faq) => normalizeQuestionForDuplicate(faq.question)));
    commit({ importedFaqCandidates: settings.importedFaqCandidates.filter((candidate) => {
      const normalized = normalizeQuestionForDuplicate(candidate.question);
      if (seen.has(normalized) || duplicateOf(candidate)) return false;
      seen.add(normalized); return true;
    }) });
  }

  function buildFaqRegistration() {
    let faqs = [...settings.faqs];
    const remaining: ImportedFAQ[] = [];
    let registered = 0;
    let invalid = 0;
    for (const candidate of settings.importedFaqCandidates) {
      if (!candidate.selected) { remaining.push(candidate); continue; }
      if ((candidate.actionUrl && !/^(https?:|tel:)/i.test(candidate.actionUrl)) || (candidate.sourceUrl && !/^https?:/i.test(candidate.sourceUrl))) {
        remaining.push(candidate); invalid += 1; continue;
      }
      const duplicate = duplicateOf(candidate);
      const action = duplicate ? duplicateActions[candidate.id] || "keep" : "both";
      if (duplicate && action === "keep") { remaining.push(candidate); continue; }
      if (duplicate && action === "exclude") continue;
      const faq: SalesDemoFAQ = {
        id: uid(), category: candidate.category, question: candidate.question, answer: candidate.answer,
        keywords: [...candidate.keywords], actionType: candidate.actionType, actionLabel: candidate.actionLabel,
        actionUrl: candidate.actionUrl, isPublished: candidate.isPublished, sortOrder: faqs.length + 1,
        updatedAt: new Date().toISOString(), origin: "external-ai", sourceTitle: candidate.sourceTitle, sourceUrl: candidate.sourceUrl,
      };
      if (duplicate && action === "replace") faqs = faqs.map((item) => item.id === duplicate.id ? { ...faq, sortOrder: item.sortOrder } : item);
      else faqs.push(faq);
      registered += 1;
    }
    faqs = faqs.map((faq, index) => ({ ...faq, sortOrder: index + 1 }));
    return { faqs, remaining, registered, invalid };
  }

  function registerSelected() {
    const result = buildFaqRegistration();
    commit({ faqs: result.faqs, importedFaqCandidates: result.remaining });
    setNotice(result.registered ? `${result.registered}件のFAQを登録しました。${result.invalid ? ` 不正なURLを含む${result.invalid}件は登録していません。` : ""}` : "登録対象を確認してください。重複候補は処理方法を選べます。");
  }

  function applyAllSelected() {
    const clinic = clinicPatch();
    const result = buildFaqRegistration();
    commit({ ...clinic, faqs: result.faqs, importedFaqCandidates: result.remaining });
    setNotice("基本情報とFAQを商談デモへ反映しました。");
  }

  function saveRegisteredFaq(faq: SalesDemoFAQ) {
    const now = new Date().toISOString();
    const saved = { ...faq, id: faq.id || uid(), updatedAt: now, sortOrder: faq.id ? faq.sortOrder : settings.faqs.length + 1, origin: faq.origin || "manual" as const };
    const faqs = faq.id ? settings.faqs.map((item) => item.id === faq.id ? saved : item) : [...settings.faqs, saved];
    commit({ faqs }); setEditingFaq(null);
  }

  function moveFaq(id: string, direction: -1 | 1) {
    const faqs = [...registeredFaqs]; const index = faqs.findIndex((faq) => faq.id === id); const next = index + direction;
    if (index < 0 || next < 0 || next >= faqs.length) return;
    [faqs[index], faqs[next]] = [faqs[next], faqs[index]];
    commit({ faqs: faqs.map((faq, order) => ({ ...faq, sortOrder: order + 1 })) });
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
      <h3 className="font-bold text-slate-800">FAQ作成・設定</h3>
      <div className="mt-2 space-y-1 text-sm text-slate-600"><p className="font-semibold">この機能はAI APIを使用しません。</p><p>公式HP URLを含む外部AI用プロンプトを作成します。</p><p>プロンプトをブラウジング可能なChatGPTまたはGeminiへ貼り付け、返されたJSONをこの画面へ登録してください。</p><p className="text-amber-700">利用するAIがWebサイトを閲覧できない場合は、公式HPの情報を取得できません。</p></div>
      <ol className="mt-4 grid gap-2 text-xs font-medium text-sky-800 sm:grid-cols-2 lg:grid-cols-4">{["外部AI用プロンプトを作成", "ブラウジング可能なAIへ貼り付け", "AIのJSON回答をコピー", "この画面へ貼り付け", "基本情報候補を比較", "FAQ候補を確認", "選択した情報を反映"].map((label, index) => <li key={label} className="rounded-lg bg-white px-3 py-2">{index + 1}. {label}</li>)}</ol>
    </section>

    {notice && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-800">商談相手HP</h3><p className="mt-1 text-sm text-slate-500">{settings.prospectWebsiteName || settings.clinicName || "サイト名未設定"}</p><p className="mt-1 break-all text-xs text-slate-500">{settings.prospectWebsiteUrl || "商談相手のホームページURLが登録されていません。先に「商談相手HP」から登録してください。"}</p>
      <button type="button" disabled={!settings.prospectWebsiteUrl} onClick={() => window.open(settings.prospectWebsiteUrl, "_blank", "noopener,noreferrer")} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-700 disabled:opacity-40"><ExternalLink size={15} />商談相手HPを開く</button>
    </section>

    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-slate-800">AI用プロンプト</h3><p className="mt-1 text-sm text-slate-500">現在の商談相手HP URLとこの商談の参考情報だけから作成します。内部メモは含みません。</p></div><button type="button" onClick={generatePrompt} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white">AI用プロンプトを作成</button></div><textarea value={settings.generatedFaqPrompt} onChange={(event) => commit({ generatedFaqPrompt: event.target.value })} rows={16} className="mt-4 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs" placeholder="「AI用プロンプトを作成」を押してください。" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!settings.generatedFaqPrompt} onClick={() => void copyPrompt()} className="rounded-lg border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-700 disabled:opacity-40">ChatGPT・Gemini用プロンプトをコピー</button><button type="button" onClick={generatePrompt} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">プロンプトを再生成</button><button type="button" onClick={() => commit({ generatedFaqPrompt: "" })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">プロンプトをクリア</button></div></section>

    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-800">ChatGPT・Geminiの回答を貼り付け</h3><p className="mt-1 text-sm text-slate-500">外部AIから返されたJSONを、そのまま貼り付けてください。基本情報とFAQ候補をまとめて読み込みます。</p><textarea value={settings.lastImportedAiResponse} onChange={(event) => commit({ lastImportedAiResponse: event.target.value })} rows={12} className="mt-4 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs" placeholder='{"websiteAccessStatus":"success","clinicInfo":{},"faqs":[]}' />{importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}<button type="button" onClick={loadCandidates} className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">基本情報・FAQ候補を読み込む</button></section>

    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-800">基本情報候補</h3><p className="text-sm text-slate-500">現在の設定と公式HPから取得した候補を比較し、反映する項目だけを選択してください。</p></div><div className="flex flex-wrap gap-2"><SmallButton onClick={() => setSelectedClinicFields(Object.fromEntries(CLINIC_FIELDS.map((field) => [field.key, true]))) }>すべて選択</SmallButton><SmallButton onClick={() => setSelectedClinicFields(Object.fromEntries(CLINIC_FIELDS.map((field) => [field.key, false]))) }>すべて解除</SmallButton><button type="button" onClick={applySelectedClinicInfo} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white">選択した基本情報を反映</button></div></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{CLINIC_FIELDS.map((field) => { const candidate = settings.importedClinicInfoCandidate[field.key] || ""; const selected = selectedClinicFields[field.key] ?? Boolean(candidate); return <label key={field.key} className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={selected} disabled={!candidate} onChange={(event) => setSelectedClinicFields({ ...selectedClinicFields, [field.key]: event.target.checked })} className="mt-1" /><span className="min-w-0"><span className="block text-xs font-bold text-slate-700">{field.label}</span><span className="mt-1 block whitespace-pre-wrap text-xs text-slate-400">現在の設定：{String(settings[field.key] || "未設定")}</span><span className="mt-1 block whitespace-pre-wrap text-sm text-slate-700">HPから取得：{candidate || "情報なし"}</span></span></label>; })}</div>{settings.importedSourcePages.length > 0 && <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-600">外部AIが確認した公式HPページ</p>{settings.importedSourcePages.map((page) => <a key={page.url} href={page.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-sky-600">{page.title}：{page.url}</a>)}</div>}</section>

    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-800">FAQ候補</h3><p className="text-sm text-slate-500">確認・修正後、選択した候補だけを登録します。</p></div><div className="flex flex-wrap gap-2"><SmallButton onClick={() => commit({ importedFaqCandidates: settings.importedFaqCandidates.map((item) => ({ ...item, selected: true })) })}>すべて選択</SmallButton><SmallButton onClick={() => commit({ importedFaqCandidates: settings.importedFaqCandidates.map((item) => ({ ...item, selected: false })) })}>すべて解除</SmallButton><SmallButton onClick={excludeDuplicates}>重複候補を除外</SmallButton><SmallButton onClick={() => commit({ importedFaqCandidates: [] })}>候補をすべて削除</SmallButton><button type="button" onClick={registerSelected} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">選択したFAQを登録</button><button type="button" onClick={applyAllSelected} className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white">選択した基本情報とFAQを一括反映</button></div></div>
      <div className="mt-4 space-y-3">{settings.importedFaqCandidates.map((candidate) => { const duplicate = duplicateOf(candidate); return <article key={candidate.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={candidate.selected} onChange={(event) => updateCandidate(candidate.id, { selected: event.target.checked })} />採用する</label><button type="button" onClick={() => commit({ importedFaqCandidates: settings.importedFaqCandidates.filter((item) => item.id !== candidate.id) })} className="text-xs text-red-600">候補を削除</button></div>{duplicate && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><p>登録済みFAQ「{duplicate.question}」と重複する可能性があります。</p><select value={duplicateActions[candidate.id] || "keep"} onChange={(event) => setDuplicateActions({ ...duplicateActions, [candidate.id]: event.target.value as DuplicateAction })} className="mt-2 rounded border border-amber-200 bg-white px-2 py-1"><option value="keep">既存FAQを維持</option><option value="replace">新しいFAQで置き換え</option><option value="both">両方残す</option><option value="exclude">新しい候補を除外</option></select></div>}<CandidateFields candidate={candidate} onChange={(patch) => updateCandidate(candidate.id, patch)} /></article>; })}{!settings.importedFaqCandidates.length && <p className="py-6 text-center text-sm text-slate-400">読み込まれたFAQ候補はありません。</p>}</div>
    </section>

    <section><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-800">登録済みFAQ</h3><p className="text-sm text-slate-500">回答テストと共有プレビューでは、ここに登録された公開FAQだけを使用します。</p></div><button type="button" onClick={() => setEditingFaq({ ...EMPTY_FAQ })} className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white"><Plus size={15} />新規手動追加</button></div><div className="mb-4 flex gap-2"><input value={faqSearch} onChange={(event) => setFaqSearch(event.target.value)} placeholder="質問・回答・キーワードを検索" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" /><select value={faqCategory} onChange={(event) => setFaqCategory(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option>すべて</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
      <div className="space-y-2">{filteredFaqs.map((faq) => { const index = registeredFaqs.findIndex((item) => item.id === faq.id); return <article key={faq.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">{faq.category}</span><span className={faq.isPublished ? "text-emerald-600" : "text-slate-400"}>{faq.isPublished ? "公開中" : "非公開"}</span><span className="text-slate-400">#{faq.sortOrder}・{faq.origin === "external-ai" ? "外部AI" : "手動／既存"}</span></div><p className="mt-1 font-semibold text-slate-800">{faq.question}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{faq.answer}</p><p className="mt-2 text-xs text-slate-400">キーワード：{faq.keywords.join("、") || "なし"}／アクション：{faq.actionType}</p>{faq.sourceUrl && <a href={faq.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-sky-600">情報元：{faq.sourceTitle || faq.sourceUrl}</a>}<p className="mt-1 text-[11px] text-slate-400">最終更新：{new Date(faq.updatedAt).toLocaleString("ja-JP")}</p></div><div className="flex shrink-0 flex-wrap gap-1"><MiniButton label="上へ" disabled={index === 0} onClick={() => moveFaq(faq.id, -1)}><ArrowUp size={14} /></MiniButton><MiniButton label="下へ" disabled={index === registeredFaqs.length - 1} onClick={() => moveFaq(faq.id, 1)}><ArrowDown size={14} /></MiniButton><MiniButton label="編集" onClick={() => setEditingFaq(faq)}><Pencil size={14} /></MiniButton><MiniButton label="複製" onClick={() => commit({ faqs: [...settings.faqs, { ...faq, id: uid(), question: `${faq.question}（コピー）`, sortOrder: settings.faqs.length + 1, updatedAt: new Date().toISOString() }] })}><Copy size={14} /></MiniButton><MiniButton label={faq.isPublished ? "非公開にする" : "公開する"} onClick={() => commit({ faqs: settings.faqs.map((item) => item.id === faq.id ? { ...item, isPublished: !item.isPublished, updatedAt: new Date().toISOString() } : item) })}>{faq.isPublished ? <XCircle size={14} /> : <CheckCircle2 size={14} />}</MiniButton><MiniButton danger label="削除" onClick={() => { if (confirm("この登録済みFAQを削除しますか？")) commit({ faqs: settings.faqs.filter((item) => item.id !== faq.id).map((item, order) => ({ ...item, sortOrder: order + 1 })) }); }}><Trash2 size={14} /></MiniButton></div></div></article>; })}{!filteredFaqs.length && <p className="py-10 text-center text-sm text-slate-400">登録済みFAQがありません。</p>}</div>
    </section>
    {editingFaq && <FaqEditor faq={editingFaq} onClose={() => setEditingFaq(null)} onSave={saveRegisteredFaq} />}
  </div>;
}

function CandidateFields({ candidate, onChange }: { candidate: ImportedFAQ; onChange: (patch: Partial<ImportedFAQ>) => void }) {
  return <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-500">カテゴリー<input value={candidate.category} maxLength={50} onChange={(event) => onChange({ category: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label><label className="text-xs font-semibold text-slate-500">アクション<select value={candidate.actionType} onChange={(event) => onChange({ actionType: event.target.value as ImportedFAQ["actionType"] })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="none">none</option><option value="phone">phone</option><option value="reservation">reservation</option><option value="link">link</option></select></label><label className="sm:col-span-2 text-xs font-semibold text-slate-500">質問<input value={candidate.question} maxLength={200} onChange={(event) => onChange({ question: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label><label className="sm:col-span-2 text-xs font-semibold text-slate-500">回答<textarea value={candidate.answer} maxLength={2000} onChange={(event) => onChange({ answer: event.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label><label className="sm:col-span-2 text-xs font-semibold text-slate-500">キーワード（カンマ区切り）<input value={candidate.keywords.join(", ")} onChange={(event) => onChange({ keywords: event.target.value.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 20) })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label><label className="text-xs font-semibold text-slate-500">ボタン文言<input value={candidate.actionLabel || ""} maxLength={100} onChange={(event) => onChange({ actionLabel: event.target.value || undefined })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label><label className="text-xs font-semibold text-slate-500">リンク先<input value={candidate.actionUrl || ""} maxLength={500} onChange={(event) => onChange({ actionUrl: event.target.value || undefined })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label><p className="text-xs text-slate-400 sm:col-span-2">情報元：{candidate.sourceTitle || "未設定"} {candidate.sourceUrl || ""}</p><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={candidate.isPublished} onChange={(event) => onChange({ isPublished: event.target.checked })} />公開する</label></div>;
}

function FaqEditor({ faq, onClose, onSave }: { faq: SalesDemoFAQ; onClose: () => void; onSave: (faq: SalesDemoFAQ) => void }) {
  const [form, setForm] = useState(faq); const [keywords, setKeywords] = useState(faq.keywords.join(", "));
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/40 p-4" onClick={onClose}><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><h3 className="font-bold text-slate-800">{faq.id ? "登録済みFAQを編集" : "FAQを手動追加"}</h3><div className="mt-4 grid gap-3"><label className="text-xs font-semibold text-slate-500">カテゴリー<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-xs font-semibold text-slate-500">質問<input value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-xs font-semibold text-slate-500">回答<textarea value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} rows={6} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-xs font-semibold text-slate-500">キーワード（カンマ区切り）<input value={keywords} onChange={(event) => setKeywords(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-xs font-semibold text-slate-500">アクション<select value={form.actionType} onChange={(event) => setForm({ ...form, actionType: event.target.value as SalesDemoFAQ["actionType"] })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"><option value="none">none</option><option value="phone">phone</option><option value="reservation">reservation</option><option value="link">link</option></select></label><label className="text-xs font-semibold text-slate-500">ボタン文言<input value={form.actionLabel || ""} onChange={(event) => setForm({ ...form, actionLabel: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-xs font-semibold text-slate-500">リンク先<input value={form.actionUrl || ""} onChange={(event) => setForm({ ...form, actionUrl: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} />公開する</label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">キャンセル</button><button type="button" disabled={!form.question.trim() || !form.answer.trim()} onClick={() => onSave({ ...form, keywords: keywords.split(",").map((value) => value.trim()).filter(Boolean) })} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">保存</button></div></div></div>;
}

function MiniButton({ label, onClick, children, disabled, danger }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; danger?: boolean }) { return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`rounded-lg border p-1.5 disabled:opacity-30 ${danger ? "border-red-200 text-red-600" : "border-slate-200 text-slate-500"}`}>{children}</button>; }
function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{children}</button>; }
