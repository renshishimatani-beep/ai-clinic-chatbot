import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import {
  deleteProspectScreenshot,
  getProspectScreenshot,
  saveProspectScreenshot,
} from "@/services/salesDemoScreenshotRepository";

export function ProspectScreenshotSettings({
  dealId,
  storageKey,
  publicUrl,
  onStored,
  onDelete,
}: {
  dealId: string;
  storageKey: string;
  publicUrl: string;
  onStored: (storageKey: string) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let nextUrl = "";
    if (storageKey) {
      void getProspectScreenshot(storageKey).then((record) => {
        if (!active || !record) return;
        nextUrl = URL.createObjectURL(record.blob);
        setObjectUrl(nextUrl);
      }).catch(() => setError("保存済みスクリーンショットを読み込めませんでした。"));
    } else {
      setObjectUrl("");
    }
    return () => {
      active = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [storageKey]);

  async function store(file: File) {
    setBusy(true);
    setError("");
    try {
      const record = await saveProspectScreenshot(dealId, file);
      onStored(record.key);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "画像を保存できませんでした。");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await deleteProspectScreenshot(storageKey);
      setObjectUrl("");
      onDelete();
    } catch {
      setError("スクリーンショットを削除できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = objectUrl || publicUrl;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">プレビュー用スクリーンショット</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">ホームページがiframe表示を制限している場合に使用します。商談相手HPのスクリーンショットを登録すると、その画像上につなまるAIを表示できます。</p>
          <p className="mt-1 text-[11px] text-slate-400">PNG・JPEG・WebP、10MB以下。横幅1920pxを目安にブラウザ内で圧縮し、この商談専用のIndexedDBへ保存します。</p>
        </div>
        {previewUrl && <button type="button" disabled={busy} onClick={() => void remove()} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"><Trash2 size={14} />登録画像を削除</button>}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void store(file);
        }}
        className={`mt-3 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${dragging ? "border-sky-400 bg-sky-50" : "border-slate-300 bg-white hover:border-sky-300"}`}
      >
        {busy ? <Loader2 className="animate-spin text-sky-500" size={24} /> : previewUrl ? <ImagePlus className="text-sky-500" size={24} /> : <Upload className="text-slate-400" size={24} />}
        <span className="mt-2 text-sm font-semibold text-slate-700">{busy ? "画像を処理しています…" : "クリックまたはドラッグ＆ドロップで登録"}</span>
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void store(file); }} />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {previewUrl && (
        <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white">
          <img src={previewUrl} alt="登録した商談相手ホームページのスクリーンショット" className="h-auto w-full object-contain object-top" />
        </div>
      )}
      {storageKey && <p className="mt-2 text-[11px] text-amber-700">このアップロード画像はこのブラウザ内だけに保存されます。別端末へ共有する場合は、下の公開画像URLも登録してください。</p>}
    </div>
  );
}
