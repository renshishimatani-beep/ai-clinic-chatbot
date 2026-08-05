import { useEffect } from "react";
import type { ChatMessage, ChatSettings, ClinicInfo, FAQ } from "@/types";
import { ChatPage } from "@/pages/ChatPage";
import { TsunamaruChatTransition } from "@/components/TsunamaruChatTransition";

export function EmbedPage({
  settings,
  clinicInfo,
  faqs,
  history,
  setHistory,
  onUnanswered,
  onResetConversation,
  clinicLogoUrl,
  persistHistory,
}: {
  settings: ChatSettings;
  clinicInfo: ClinicInfo;
  faqs: FAQ[];
  history: ChatMessage[];
  setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onUnanswered: (question: string) => void;
  onResetConversation: () => void;
  clinicLogoUrl?: string;
  persistHistory?: boolean;
}) {
  useEffect(() => {
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
    };
  }, []);

  return (
    <div className="fixed inset-0" style={{ background: "transparent" }}>
      <TsunamaruChatTransition mainColor={settings.mainColor || "#3BA9D4"}>
        {(close) => (
          <ChatPage
            settings={settings}
            clinicInfo={clinicInfo}
            faqs={faqs}
            history={history}
            setHistory={setHistory}
            onUnanswered={onUnanswered}
            onResetConversation={onResetConversation}
            widgetMode
            onClose={close}
            clinicLogoUrl={clinicLogoUrl}
            persistHistory={persistHistory}
          />
        )}
      </TsunamaruChatTransition>
    </div>
  );
}
