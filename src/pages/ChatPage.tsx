import { useEffect, useMemo, useRef, useState } from "react";
import { Phone, CalendarPlus, RefreshCw, Send, Info, RotateCcw, X } from "lucide-react";
import type { ChatMessage, ChatSettings, ClinicInfo, FAQ } from "@/types";
import { storage, uid } from "@/services/storage";
import { matchFAQ } from "@/utils/faqMatcher";
import { fillPlaceholders } from "@/utils/placeholders";
import { checkSafety, MEDICAL_RESPONSE, EMERGENCY_RESPONSE } from "@/utils/safety";
import { Character, type CharacterState } from "@/components/Character";
import { QUICK_QUESTIONS } from "@/components/QuickQuestions";

const NOTICE =
  "氏名、電話番号、診察券番号、具体的な症状、検査結果などの個人情報は入力しないでください。";

export function ChatPage({
  settings,
  clinicInfo,
  faqs,
  history,
  setHistory,
  onUnanswered,
  onResetConversation,
  widgetMode,
  onClose,
  clinicLogoUrl,
  persistHistory = true,
}: {
  settings: ChatSettings;
  clinicInfo: ClinicInfo;
  faqs: FAQ[];
  history: ChatMessage[];
  setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onUnanswered: (question: string) => void;
  onResetConversation: () => void;
  widgetMode?: boolean;
  onClose?: () => void;
  clinicLogoUrl?: string;
  persistHistory?: boolean;
}) {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [charState, setCharState] = useState<CharacterState>("welcome");
  const [logoVisible, setLogoVisible] = useState(Boolean(clinicLogoUrl));
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const mainColor = settings.mainColor || "#3BA9D4";

  useEffect(() => {
    if (persistHistory) storage.setHistory(history);
  }, [history, persistHistory]);

  useEffect(() => {
    setLogoVisible(Boolean(clinicLogoUrl));
  }, [clinicLogoUrl]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, thinking]);

  function pushBot(text: string, opts: Partial<ChatMessage> = {}) {
    const msg: ChatMessage = {
      id: uid(),
      role: "bot",
      text,
      timestamp: new Date().toISOString(),
      answered: true,
      ...opts,
    };
    setHistory((prev) => [...prev, msg]);
  }

  function pushUser(text: string) {
    const msg: ChatMessage = {
      id: uid(),
      role: "user",
      text,
      timestamp: new Date().toISOString(),
      answered: false,
    };
    setHistory((prev) => [...prev, msg]);
  }

  function handleSend(raw: string) {
    const text = raw.trim();
    if (!text || thinking) return;

    if (text === "電話で問い合わせたい") {
      pushUser("電話で問い合わせたい");
      setCharState("phone");
      pushBot(fillPlaceholders("{{clinicName}}へは、{{phone}}までお電話ください。", clinicInfo), {
        action: { type: "phone", label: "今すぐ電話する", url: `tel:${clinicInfo.phone}` },
      });
      return;
    }

    pushUser(text);
    setInput("");

    const safety = checkSafety(text);
    if (safety === "emergency") {
      setCharState("sorry");
      pushBot(EMERGENCY_RESPONSE, { answered: false });
      onUnanswered(text);
      return;
    }
    if (safety === "medical") {
      setCharState("sorry");
      pushBot(MEDICAL_RESPONSE, { answered: false });
      onUnanswered(text);
      return;
    }

    setThinking(true);
    setCharState("thinking");
    window.setTimeout(() => {
      setThinking(false);
      const result = matchFAQ(text, faqs);
      if (result.faq) {
        setCharState("answer");
        const action = buildAction(result.faq, clinicInfo);
        pushBot(fillPlaceholders(result.faq.answer, clinicInfo), {
          matchedFaqId: result.faq.id,
          matchedFaqQuestion: result.faq.question,
          action,
        });
      } else {
        setCharState("sorry");
        pushBot(settings.fallbackMessage, { answered: false });
        onUnanswered(text);
      }
    }, 650);
  }

  function buildAction(faq: FAQ, clinic: ClinicInfo): ChatMessage["action"] {
    switch (faq.actionType) {
      case "phone":
        return { type: "phone", label: faq.actionLabel || "クリニックに電話する", url: `tel:${clinic.phone}` };
      case "reservation":
        return { type: "reservation", label: faq.actionLabel || "Web予約", url: clinic.reservationUrl };
      case "link":
        return { type: "link", label: faq.actionLabel || "リンクを開く", url: faq.actionUrl || clinic.websiteUrl };
      default:
        return undefined;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  const hasUserMessages = history.some((m) => m.role === "user");
  const showWelcome = !hasUserMessages;
  const quickButtons = useMemo(() => QUICK_QUESTIONS, []);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[520px] flex-col overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <header
        className="px-4 py-3 text-white shadow-sm shrink-0"
        style={{ background: `linear-gradient(135deg, ${mainColor}, #7FCCE5)` }}
      >
        <div className="flex items-center gap-3">
          {logoVisible && clinicLogoUrl ? (
            <img
              src={clinicLogoUrl}
              alt={`${clinicInfo.clinicName}のロゴ`}
              className="h-11 w-11 rounded-lg bg-white/90 object-contain p-1 shrink-0"
              onError={() => setLogoVisible(false)}
            />
          ) : settings.showCharacter && (
            <Character state={charState} size={44} className="rounded-full bg-transparent p-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">つなまるAI</h1>
            <p className="text-xs opacity-90 truncate">{clinicInfo.clinicName}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              オンライン
            </span>
            <span className="text-[10px] opacity-80">24時間ご案内</span>
          </div>
          <button
            onClick={onResetConversation}
            className="focus-ring shrink-0 rounded-full bg-white/20 hover:bg-white/30 p-2 text-white transition active:scale-95"
            aria-label="会話をリセット"
            title="会話をリセット"
          >
            <RotateCcw size={16} />
          </button>
          {widgetMode && onClose && (
            <button
              onClick={onClose}
              className="focus-ring shrink-0 rounded-full bg-white/20 hover:bg-white/30 p-2 text-white transition active:scale-95"
              aria-label="チャットを閉じる"
              title="チャットを閉じる"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <main ref={scrollRef} className="tsunamaru-chat-scroll-area chat-scroll space-y-4">
        {showWelcome && <WelcomeCard settings={settings} />}
        {showWelcome && (
          <div className="grid grid-cols-2 gap-2">
            {quickButtons.map((q) => (
              <button
                key={q.label}
                onClick={() => handleSend(q.text)}
                className="focus-ring flex items-center gap-2 rounded-xl border bg-white px-3 py-3 text-xs font-medium text-slate-700 transition-all hover:shadow-md active:scale-[0.97]"
                style={{ borderColor: `${mainColor}33` }}
              >
                <span className="shrink-0" style={{ color: mainColor }}>{q.icon}</span>
                <span className="text-left leading-tight">{q.label}</span>
              </button>
            ))}
          </div>
        )}
        {history.map((m) => (
          <MessageBubble key={m.id} message={m} settings={settings} />
        ))}
        {thinking && (
          <div className="flex items-end gap-2">
            {settings.showCharacter && <Character state="thinking" size={36} className="rounded-full shrink-0" />}
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 border border-slate-200 shadow-sm">
              <span className="inline-flex gap-1">
                <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Input area */}
      <div className="shrink-0 bg-white px-4 pt-2 pb-3 border-t border-slate-100">
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-2">
          <Info size={13} className="mt-0.5 shrink-0" />
          {NOTICE}
        </p>
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-[var(--main-color)] transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="質問を入力してください"
            className="flex-1 resize-none outline-none text-sm bg-transparent px-2 py-1.5 max-h-32"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || thinking}
            className="focus-ring shrink-0 rounded-xl p-3 text-white transition active:scale-95 disabled:opacity-40 disabled:active:scale-100 shadow-sm"
            style={{ backgroundColor: mainColor }}
            aria-label="メッセージを送信"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-slate-400">{settings.disclaimer}</p>
      </div>
    </div>
  );
}

function WelcomeCard({ settings }: { settings: ChatSettings }) {
  return (
    <div
      className="rounded-3xl p-5 shadow-sm"
      style={{ background: "linear-gradient(135deg, #E8F4FB, #F0F9FF)" }}
    >
      <div className="flex flex-col items-center gap-4">
        {settings.showCharacter && (
          <Character state="welcome" size={150} className="rounded-3xl shrink-0" />
        )}
        <div className="text-center">
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {settings.welcomeMessage}
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, settings }: { message: ChatMessage; settings: ChatSettings }) {
  const isUser = message.role === "user";
  const mainColor = settings.mainColor || "#3BA9D4";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-white whitespace-pre-wrap break-words shadow-sm"
          style={{ backgroundColor: mainColor }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      {settings.showCharacter && <Character state="answer" size={36} className="rounded-full shrink-0" />}
      <div className="max-w-[75%]">
        <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-slate-700 whitespace-pre-wrap break-words border border-slate-200 shadow-sm">
          {message.text}
        </div>
        {message.action && <ActionButton action={message.action} mainColor={mainColor} />}
      </div>
    </div>
  );
}

function ActionButton({
  action,
  mainColor,
}: {
  action: NonNullable<ChatMessage["action"]>;
  mainColor: string;
}) {
  const icon =
    action.type === "phone" ? <Phone size={14} /> : action.type === "reservation" ? <CalendarPlus size={14} /> : <RefreshCw size={14} />;
  return (
    <a
      href={action.url || "#"}
      target={action.type === "link" ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="focus-ring mt-1.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95"
      style={{ backgroundColor: mainColor }}
    >
      {icon}
      {action.label}
    </a>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
