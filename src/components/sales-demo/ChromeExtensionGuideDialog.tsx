import { FolderOpen, Puzzle, X } from "lucide-react";

export function ChromeExtensionGuideDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><Puzzle size={20} className="text-sky-600" />Chrome拡張の使い方</h2><p className="mt-1 text-sm text-slate-500">実サイト上での表示は、商談担当者のChrome内だけに適用されます。相手ホームページ自体は変更しません。</p></div>
          <button type="button" onClick={onClose} aria-label="閉じる" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <ol className="mt-5 space-y-4 text-sm text-slate-700">
          <li className="rounded-xl border border-slate-200 p-4"><strong>1. 拡張機能をビルド</strong><p className="mt-1 text-slate-500"><code>npm run build:extension</code> を実行します。通常の <code>npm run build</code> でも同時に生成されます。</p></li>
          <li className="rounded-xl border border-slate-200 p-4"><strong>2. Chromeへ読み込む</strong><p className="mt-1 text-slate-500"><code>chrome://extensions</code> を開き、デベロッパーモードを有効にして「パッケージ化されていない拡張機能を読み込む」から <code>chrome-extension</code> フォルダを選択します。</p></li>
          <li className="rounded-xl border border-slate-200 p-4"><strong>3. 商談設定を登録</strong><p className="mt-1 text-slate-500">管理画面の「Chromeデモ設定をコピー」を押し、拡張機能の入力欄へ貼り付けて「設定を読み込む」を押します。</p></li>
          <li className="rounded-xl border border-slate-200 p-4"><strong>4. 実サイトで表示</strong><p className="mt-1 text-slate-500">対象クリニックの通常のhttp/httpsページを開き、拡張機能から「このページにつなまるAIを表示」を押します。ページを再読み込みすると表示は消えます。</p></li>
        </ol>
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"><FolderOpen size={18} className="mt-0.5 shrink-0" /><p>読み込み先：<code>project/chrome-extension</code><br />Chrome内部ページ、Chromeウェブストア、PDFでは実行できません。</p></div>
      </div>
    </div>
  );
}
