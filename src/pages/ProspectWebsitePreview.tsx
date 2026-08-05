import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, Image as ImageIcon, Monitor, Puzzle, RefreshCw, Smartphone, X } from "lucide-react";
import type { ChatMessage, ChatSettings, ClinicInfo, FAQ, ProspectPreviewMode } from "@/types";
import { TsunamaruChatTransition } from "@/components/TsunamaruChatTransition";
import { ChatPage } from "@/pages/ChatPage";
import { ChromeExtensionGuideDialog } from "@/components/sales-demo/ChromeExtensionGuideDialog";

type DeviceMode = "desktop" | "mobile";

export function ProspectWebsitePreview({
  websiteUrl, websiteName, screenshotUrl, previewMode = "auto", settings, clinicInfo, clinicLogoUrl,
  faqs, history, setHistory, onUnanswered, onResetConversation, showToolbar, sharedUrl,
  persistHistory = true, onExit, onChangeUrl, onPreviewModeChange, onRegisterScreenshot,
}: {
  websiteUrl: string;
  websiteName?: string;
  screenshotUrl?: string;
  previewMode?: ProspectPreviewMode;
  settings: ChatSettings;
  clinicInfo: ClinicInfo;
  clinicLogoUrl?: string;
  faqs: FAQ[];
  history: ChatMessage[];
  setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onUnanswered: (question: string) => void;
  onResetConversation: () => void;
  showToolbar: boolean;
  sharedUrl?: string;
  persistHistory?: boolean;
  onExit?: () => void;
  onChangeUrl?: () => void;
  onPreviewModeChange?: (mode: ProspectPreviewMode) => void;
  onRegisterScreenshot?: () => void;
}) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [selectedMode, setSelectedMode] = useState<ProspectPreviewMode>(previewMode);
  const [activeMode, setActiveMode] = useState<"iframe" | "screenshot">(
    previewMode === "screenshot" && screenshotUrl ? "screenshot" : "iframe",
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [showDisplayCheck, setShowDisplayCheck] = useState(false);
  const [showRestrictionPanel, setShowRestrictionPanel] = useState(previewMode === "screenshot" && !screenshotUrl);
  const [copied, setCopied] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const previewBoundaryRef = useRef<HTMLDivElement>(null);
  const simulatedMobile = showToolbar && deviceMode === "mobile";

  useEffect(() => {
    setSelectedMode(previewMode);
    setActiveMode(previewMode === "screenshot" && screenshotUrl ? "screenshot" : "iframe");
    setShowRestrictionPanel(previewMode === "screenshot" && !screenshotUrl);
  }, [previewMode, screenshotUrl]);

  useEffect(() => {
    if (!showToolbar || activeMode !== "iframe" || showRestrictionPanel) {
      setShowDisplayCheck(false);
      return;
    }
    setShowDisplayCheck(false);
    const timer = window.setTimeout(() => setShowDisplayCheck(true), 6000);
    return () => window.clearTimeout(timer);
  }, [activeMode, reloadKey, showRestrictionPanel, showToolbar, websiteUrl]);

  async function copySharedUrl() {
    if (!sharedUrl) return;
    try {
      await navigator.clipboard.writeText(sharedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  }

  function chooseMode(mode: ProspectPreviewMode) {
    setSelectedMode(mode);
    onPreviewModeChange?.(mode);
    if (mode === "screenshot") {
      if (screenshotUrl) {
        setActiveMode("screenshot");
        setShowRestrictionPanel(false);
      } else {
        setShowRestrictionPanel(true);
      }
    } else {
      setActiveMode("iframe");
      setShowRestrictionPanel(false);
      setReloadKey((value) => value + 1);
    }
  }

  function reportNotDisplaying() {
    setShowDisplayCheck(false);
    setShowRestrictionPanel(true);
  }

  function reportDisplaying() {
    setShowDisplayCheck(false);
    setSelectedMode("iframe");
    onPreviewModeChange?.("iframe");
  }

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-slate-100">
      {showToolbar && (
        <header className="relative z-[60] flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="min-w-[180px] flex-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">商談相手HPプレビュー</p><p className="truncate text-xs font-medium text-slate-700" title={websiteUrl}>{websiteUrl}</p></div>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <ModeButton label="自動（iframe優先）" active={selectedMode === "auto"} onClick={() => chooseMode("auto")} />
            <ModeButton label="iframe固定" active={selectedMode === "iframe"} onClick={() => chooseMode("iframe")} />
            <ModeButton label="スクリーンショット" active={selectedMode === "screenshot"} onClick={() => chooseMode("screenshot")} />
          </div>
          <ToolbarButton label="画像を登録" onClick={onRegisterScreenshot}><ImageIcon size={14} /></ToolbarButton>
          <ToolbarButton label="再読み込み" onClick={() => { setActiveMode("iframe"); setShowRestrictionPanel(false); setReloadKey((value) => value + 1); }}><RefreshCw size={14} /></ToolbarButton>
          <ToolbarButton label="PC表示" active={deviceMode === "desktop"} onClick={() => setDeviceMode("desktop")}><Monitor size={14} /></ToolbarButton>
          <ToolbarButton label="スマートフォン表示" active={deviceMode === "mobile"} onClick={() => setDeviceMode("mobile")}><Smartphone size={14} /></ToolbarButton>
          <ToolbarButton label="元サイトを開く" onClick={() => window.open(websiteUrl, "_blank", "noopener,noreferrer")}><ExternalLink size={14} /></ToolbarButton>
          <ToolbarButton label={copied ? "コピーしました" : "共有URLをコピー"} disabled={!sharedUrl} onClick={() => void copySharedUrl()}>{copied ? <Check size={14} /> : <Copy size={14} />}</ToolbarButton>
          <ToolbarButton label="終了" onClick={onExit}><X size={14} /></ToolbarButton>
        </header>
      )}

      <div className={`flex min-h-0 flex-1 items-center justify-center overflow-hidden ${simulatedMobile ? "p-3" : ""}`}>
        <div ref={previewBoundaryRef} className={simulatedMobile ? "relative h-[844px] max-h-full w-[390px] max-w-full overflow-hidden rounded-[28px] border-[8px] border-slate-800 bg-white shadow-2xl" : "relative h-full w-full overflow-hidden bg-white"}>
          {activeMode === "screenshot" && screenshotUrl ? (
            <div className="absolute inset-0 z-0 overflow-y-auto overflow-x-hidden bg-white">
              <img src={screenshotUrl} alt="商談相手ホームページのプレビュー" className="h-auto min-h-full w-full object-contain object-top" />
            </div>
          ) : (
            <iframe
              key={reloadKey}
              src={websiteUrl}
              title={`${websiteName || clinicInfo.clinicName || "クリニック"} ホームページプレビュー`}
              className="absolute inset-0 z-0 h-full w-full border-0 bg-white"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}

          {showToolbar && showDisplayCheck && activeMode === "iframe" && !showRestrictionPanel && (
            <div className="absolute bottom-4 left-4 z-30 max-w-sm rounded-2xl border border-sky-200 bg-white/95 p-4 shadow-xl backdrop-blur" role="status">
              <p className="text-sm font-bold text-slate-800">ホームページは正常に表示されていますか？</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={reportDisplaying} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">正常に表示されている</button>
                <button type="button" onClick={reportNotDisplaying} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">表示されていない</button>
                <button type="button" onClick={() => chooseMode("screenshot")} className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700">スクリーンショットへ切り替える</button>
              </div>
            </div>
          )}

          {showToolbar && showRestrictionPanel && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/35 p-4">
              <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl">
                <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={22} /><div><h2 className="font-bold text-slate-800">このホームページは、外部ページ内での表示が制限されている可能性があります。</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">スクリーンショット表示へ切り替えるか、Chrome拡張を使って実サイト上で確認してください。iframe制限は、実際につなまるAIを設置できないという意味ではありません。</p></div></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ToolbarButton label="iframeでもう一度確認" onClick={() => chooseMode("iframe")}><RefreshCw size={14} /></ToolbarButton>
                  {screenshotUrl
                    ? <ToolbarButton label="スクリーンショットへ切り替える" onClick={() => chooseMode("screenshot")}><ImageIcon size={14} /></ToolbarButton>
                    : <ToolbarButton label="スクリーンショットを登録" onClick={onRegisterScreenshot}><ImageIcon size={14} /></ToolbarButton>}
                  <ToolbarButton label="元サイトを開く" onClick={() => window.open(websiteUrl, "_blank", "noopener,noreferrer")}><ExternalLink size={14} /></ToolbarButton>
                  <ToolbarButton label="Chrome拡張の使い方" onClick={() => setGuideOpen(true)}><Puzzle size={14} /></ToolbarButton>
                  <ToolbarButton label="URLを変更" onClick={onChangeUrl}><RefreshCw size={14} /></ToolbarButton>
                </div>
              </div>
            </div>
          )}

          <TsunamaruChatTransition mainColor={settings.mainColor || "#3BA9D4"} launcherPosition="absolute" boundaryRef={previewBoundaryRef} forceMobile={simulatedMobile}>
            {(close) => <ChatPage settings={settings} clinicInfo={clinicInfo} faqs={faqs} history={history} setHistory={setHistory} onUnanswered={onUnanswered} onResetConversation={onResetConversation} widgetMode onClose={close} clinicLogoUrl={clinicLogoUrl} persistHistory={persistHistory} />}
          </TsunamaruChatTransition>
          {guideOpen && <ChromeExtensionGuideDialog onClose={() => setGuideOpen(false)} />}
        </div>
      </div>
    </div>
  );
}

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-md px-2 py-1.5 text-xs font-semibold ${active ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}>{label}</button>;
}

function ToolbarButton({ label, children, onClick, active, disabled }: { label: string; children: React.ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} title={label} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}<span className="hidden xl:inline">{label}</span><span className="sr-only xl:hidden">{label}</span></button>;
}
