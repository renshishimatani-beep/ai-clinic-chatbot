import {
  Clock,
  Stethoscope,
  MapPin,
  CalendarPlus,
  Phone,
  Navigation,
  HeartPulse,
  FileText,
  Shield,
  Car,
} from "lucide-react";
import type { ChatMessage, ChatSettings, ClinicInfo, FAQ } from "@/types";
import { ChatPage } from "@/pages/ChatPage";
import { TsunamaruChatTransition } from "@/components/TsunamaruChatTransition";

export function SitePreviewPage({
  settings,
  clinicInfo,
  faqs,
  history,
  setHistory,
  onUnanswered,
  onResetConversation,
  demoLogoUrl,
  persistHistory,
}: {
  settings: ChatSettings;
  clinicInfo: ClinicInfo;
  faqs: FAQ[];
  history: ChatMessage[];
  setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onUnanswered: (question: string) => void;
  onResetConversation: () => void;
  demoLogoUrl?: string;
  persistHistory?: boolean;
}) {
  const mainColor = settings.mainColor || "#3BA9D4";

  const services = [
    { icon: <Stethoscope size={24} />, title: "一般診療", desc: "内科・小児科の一般診療に対応しています。" },
    { icon: <Shield size={24} />, title: "予防接種", desc: "各種ワクチン接種を承っています。" },
    { icon: <FileText size={24} />, title: "健康診断", desc: "定期健康診断・人間ドックの案内。" },
    { icon: <HeartPulse size={24} />, title: "生活習慣病管理", desc: "高血圧・糖尿病などの継続管理。" },
  ];

  return (
    <>
      <div className="min-h-[calc(100vh-49px)] bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {demoLogoUrl ? (
                <img
                  src={demoLogoUrl}
                  alt=""
                  className="w-9 h-9 rounded-xl object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-white shrink-0"
                  style={{ backgroundColor: mainColor }}
                >
                  <HeartPulse size={20} />
                </span>
              )}
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{clinicInfo.clinicName || "みなと海浜クリニック"}</p>
                <p className="text-[10px] text-slate-400 truncate">{clinicInfo.departments || "内科・小児科"}</p>
              </div>
            </div>
            <nav className="hidden sm:flex gap-6 text-sm text-slate-600">
              <a href="#hero" className="hover:text-slate-900 transition-colors">ホーム</a>
              <a href="#services" className="hover:text-slate-900 transition-colors">診療案内</a>
              <a href="#access" className="hover:text-slate-900 transition-colors">アクセス</a>
            </nav>
            <a
              href={clinicInfo.reservationUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 shrink-0"
              style={{ backgroundColor: mainColor }}
            >
              <CalendarPlus size={16} />
              <span className="hidden sm:inline">Web予約</span>
            </a>
          </div>
        </header>

        {/* Hero */}
        <section id="hero" className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${mainColor}, #7FCCE5)` }}>
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white" />
            <div className="absolute bottom-10 right-20 w-60 h-60 rounded-full bg-white" />
          </div>
          <div className="relative max-w-5xl mx-auto px-4 py-16 sm:py-24 text-white">
            <p className="text-sm font-medium opacity-90 mb-2">地域の皆さまに信頼される医療を</p>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">{clinicInfo.clinicName || "みなと海浜クリニック"}</h1>
            <p className="text-base sm:text-lg opacity-90 max-w-xl mb-8 leading-relaxed">
              {clinicInfo.doctorName ? `${clinicInfo.doctorName}が担当いたします。` : ""}
              急な症状にも丁寧に対応。お子さまからお年寄りまで、安心してご相談ください。
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={clinicInfo.reservationUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold transition hover:opacity-90"
                style={{ color: mainColor }}
              >
                <CalendarPlus size={18} />
                Web予約する
              </a>
              <a
                href={`tel:${clinicInfo.phone}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/20 px-6 py-3 text-sm font-bold text-white border border-white/30 transition hover:bg-white/30"
              >
                <Phone size={18} />
                {clinicInfo.phone || "お電話でご予約"}
              </a>
            </div>
          </div>
        </section>

        {/* Hours */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} style={{ color: mainColor }} />
              <h2 className="text-lg font-bold text-slate-800">診療時間</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">診療時間</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">
                  {clinicInfo.openingHours || "月〜金 9:00〜12:30 / 15:00〜18:00\n土 9:00〜12:00"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">休診日</p>
                <p className="text-sm text-slate-800">{clinicInfo.closedDays || "日曜日・祝日"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="max-w-5xl mx-auto px-4 pb-4">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">診療内容</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {services.map((s) => (
              <div key={s.title} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center">
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
                  style={{ backgroundColor: `${mainColor}1a`, color: mainColor }}
                >
                  {s.icon}
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Access */}
        <section id="access" className="max-w-5xl mx-auto px-4 pb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-12">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={20} style={{ color: mainColor }} />
              <h2 className="text-lg font-bold text-slate-800">アクセス</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="whitespace-pre-wrap">{clinicInfo.address || "〒000-0000 神奈川県横浜市港区海浜1-2-3"}</span>
              </div>
              <div className="flex items-start gap-2">
                <Navigation size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="whitespace-pre-wrap">{clinicInfo.access || "みなと駅北口から徒歩3分"}</span>
              </div>
              <div className="flex items-start gap-2">
                <Car size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="whitespace-pre-wrap">{clinicInfo.parking || "駐車場5台あり（無料）"}</span>
              </div>
            </div>
            <a
              href={clinicInfo.reservationUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: mainColor }}
            >
              <CalendarPlus size={18} />
              予約する
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-800 text-slate-300 py-6">
          <div className="max-w-5xl mx-auto px-4 text-center text-xs">
            <p className="font-bold text-white mb-1">{clinicInfo.clinicName || "みなと海浜クリニック"}</p>
            <p>{clinicInfo.address || "神奈川県横浜市港区海浜1-2-3"}</p>
            <p className="mt-2 opacity-60">© 2024 {clinicInfo.clinicName || "みなと海浜クリニック"} All rights reserved.</p>
          </div>
        </footer>
      </div>

      <TsunamaruChatTransition mainColor={mainColor}>
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
            clinicLogoUrl={demoLogoUrl}
            persistHistory={persistHistory}
          />
        )}
      </TsunamaruChatTransition>
    </>
  );
}
