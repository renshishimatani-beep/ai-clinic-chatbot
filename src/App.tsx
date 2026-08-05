import { useEffect, useState, useCallback } from "react";
import { LogOut, Loader2, Building2, ChevronDown } from "lucide-react";
import type { FAQ, ClinicInfo, ChatSettings, ChatMessage, UnansweredQuestion } from "@/types";
import { storage, uid } from "@/services/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCurrentSession, signOut, onAuthChange } from "@/services/authService";
import { fetchMemberClinics, fetchClinicInfoById, fetchClinicInfoBySlug, type Clinic } from "@/services/clinicRepository";
import { fetchFaqsByClinicId, fetchFaqsBySlug } from "@/services/faqRepository";
import { fetchChatSettingsById, fetchChatSettingsBySlug } from "@/services/chatSettingsRepository";
import { AdminPage } from "@/pages/AdminPage";
import { SitePreviewPage } from "@/pages/SitePreviewPage";
import { EmbedPage } from "@/pages/EmbedPage";
import { ProspectWebsitePreview } from "@/pages/ProspectWebsitePreview";
import { LoginPage } from "@/pages/LoginPage";
import { SAMPLE_FAQS, DEFAULT_SETTINGS, SAMPLE_CLINIC_INFO } from "@/data/sampleData";
import {
  applySharedDemoConfigToClinicInfo,
  createSharedDemoConfig,
  decodeSharedDemoConfig,
  encodeSharedDemoConfig,
  normalizeProspectWebsiteUrl,
  salesDemoFaqsToFaqs,
  sharedDemoFaqsToFaqs,
  validateProspectScreenshotUrl,
  validateProspectWebsiteUrl,
} from "@/utils/sharedDemoConfig";
import { getSalesDemoDeal, salesDemoDealToSettings, updateSalesDemoDeal } from "@/services/salesDemoRepository";
import { getProspectScreenshot } from "@/services/salesDemoScreenshotRepository";
import type { Session, User } from "@supabase/supabase-js";

type HashRoute = {
  route: "" | "admin/login" | "admin" | "admin/sales-demos" | "admin/sales-demo-deal" | "admin/sales-demo-prospect" | "embed" | "shared-demo/site" | "shared-demo/embed" | "shared-demo/prospect";
  slug: string | null;
  configPayload: string | null;
};

const REMOVED_ADMIN_ROUTES = [
  "/admin/clinic",
  "/admin/clinic-information",
  "/admin/faqs",
  "/admin/faq",
  "/admin/unanswered",
  "/admin/chat-settings",
];

const REMOVED_HISTORY_ROUTES = ["/admin/history", "/admin/conversation-history"];

function parseHashRoute(): HashRoute {
  const hash = window.location.hash.slice(1);
  const [rawRoutePath, queryString = ""] = hash.split("?", 2);
  const routePath = rawRoutePath.startsWith("/") ? rawRoutePath : `/${rawRoutePath}`;
  const params = new URLSearchParams(queryString);
  const configPayload = params.get("config");

  if (routePath === "/shared-demo/site") return { route: "shared-demo/site", slug: null, configPayload };
  if (routePath === "/shared-demo/embed") return { route: "shared-demo/embed", slug: null, configPayload };
  if (routePath === "/shared-demo/prospect") return { route: "shared-demo/prospect", slug: null, configPayload };
  if (routePath === "/admin/login") return { route: "admin/login", slug: null, configPayload: null };
  if (routePath === "/admin/sales-demo" || routePath === "/admin/sales-demos") return { route: "admin/sales-demos", slug: null, configPayload: null };
  if (REMOVED_HISTORY_ROUTES.includes(routePath)) return { route: "admin", slug: null, configPayload: null };
  if (REMOVED_ADMIN_ROUTES.includes(routePath)) return { route: "admin/sales-demos", slug: null, configPayload: null };
  if (routePath === "/admin") return { route: "admin", slug: null, configPayload: null };
  if (routePath === "/embed") return { route: "embed", slug: null, configPayload: null };

  const dealRoute = routePath.match(/^\/admin\/sales-demos\/([A-Za-z0-9_-]+)(\/prospect)?$/);
  if (dealRoute) return { route: dealRoute[2] ? "admin/sales-demo-prospect" : "admin/sales-demo-deal", slug: dealRoute[1], configPayload: null };

  if (routePath === "/chat" || routePath.startsWith("/chat/") || routePath === "/prospect-preview") {
    return { route: "admin/sales-demos", slug: null, configPayload: null };
  }

  const slugRoute = routePath.match(/^\/(embed)\/([A-Za-z0-9_-]+)$/);
  if (slugRoute) {
    return {
      route: "embed",
      slug: slugRoute[2],
      configPayload: null,
    };
  }
  return { route: "", slug: null, configPayload: null };
}

function isAdminRoute(route: HashRoute["route"]): boolean {
  return route === "admin" || route === "admin/sales-demos" || route === "admin/sales-demo-deal";
}

export default function App() {
  const [hashRoute, setHashRoute] = useState<HashRoute>(() => parseHashRoute());
  const isSharedRoute = hashRoute.route === "shared-demo/site" || hashRoute.route === "shared-demo/embed" || hashRoute.route === "shared-demo/prospect";
  const isLocalDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const [faqs, setFaqs] = useState<FAQ[]>(() => {
    if (isSharedRoute) return SAMPLE_FAQS;
    storage.migrateIfNeeded();
    return storage.getFAQs();
  });
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>(() => storage.getClinicInfo());
  const [settings, setSettings] = useState<ChatSettings>(() => storage.getSettings());
  const [history, setHistory] = useState<ChatMessage[]>(() => isSharedRoute ? [] : storage.getHistory());
  const [sharedHistory, setSharedHistory] = useState<ChatMessage[]>([]);
  const [unanswered, setUnanswered] = useState<UnansweredQuestion[]>(() => isSharedRoute ? [] : storage.getUnanswered());
  const [managedScreenshotObjectUrl, setManagedScreenshotObjectUrl] = useState("");

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [clinicError, setClinicError] = useState("");

  // Sync hash route
  useEffect(() => {
    function onHashChange() {
      setHashRoute(parseHashRoute());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const rawPath = window.location.hash.slice(1).split("?", 1)[0];
    if (REMOVED_HISTORY_ROUTES.includes(rawPath)) {
      window.location.hash = "#/admin";
    } else if (hashRoute.route === "" || rawPath === "/chat" || rawPath.startsWith("/chat/") || rawPath === "/prospect-preview" || REMOVED_ADMIN_ROUTES.includes(rawPath)) {
      window.location.hash = "#/admin/sales-demos";
    }
  }, [hashRoute.route]);

  // Init auth session
  useEffect(() => {
    if (isSharedRoute) {
      setAuthLoading(false);
      return;
    }
    if (!isSupabaseConfigured || isLocalDevelopment) {
      setAuthLoading(false);
      return;
    }
    (async () => {
      const { session } = await getCurrentSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
    })();
    const unsubscribe = onAuthChange((session: Session | null) => {
      setUser(session?.user ?? null);
    });
    return unsubscribe;
  }, [isLocalDevelopment, isSharedRoute]);

  // Load clinics when user logs in
  const loadClinics = useCallback(async () => {
    if (!user) return;
    setClinicLoading(true);
    setClinicError("");
    const { data, error } = await fetchMemberClinics();
    setClinicLoading(false);
    if (error) {
      setClinicError(error);
      return;
    }
    if (data && data.length > 0) {
      setClinics(data);
      if (data.length === 1) {
        setSelectedClinic(data[0]);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) loadClinics();
    else {
      setClinics([]);
      setSelectedClinic(null);
    }
  }, [user, loadClinics]);

  // Load clinic data from Supabase when clinic is selected
  const loadClinicData = useCallback(async (clinicId: string) => {
    setClinicLoading(true);
    setClinicError("");
    const [infoResult, faqResult, settingsResult] = await Promise.all([
      fetchClinicInfoById(clinicId),
      fetchFaqsByClinicId(clinicId),
      fetchChatSettingsById(clinicId),
    ]);
    setClinicLoading(false);
    if (infoResult.error) {
      setClinicError(infoResult.error);
      return;
    }
    if (infoResult.data) {
      const merged = { ...SAMPLE_CLINIC_INFO, ...infoResult.data };
      setClinicInfo(merged);
      storage.setClinicInfo(merged);
    }
    if (faqResult.data) {
      setFaqs(faqResult.data);
      storage.setFAQs(faqResult.data);
    }
    if (settingsResult.data) {
      const merged = { ...DEFAULT_SETTINGS, ...settingsResult.data };
      setSettings(merged);
      storage.setSettings(merged);
    }
  }, []);

  useEffect(() => {
    if (user && selectedClinic) {
      loadClinicData(selectedClinic.id);
    }
  }, [user, selectedClinic, loadClinicData]);

  // Load public data by slug for slug routes
  const loadPublicData = useCallback(async (slug: string) => {
    if (!isSupabaseConfigured) return;
    const [infoResult, faqResult, settingsResult] = await Promise.all([
      fetchClinicInfoBySlug(slug),
      fetchFaqsBySlug(slug),
      fetchChatSettingsBySlug(slug),
    ]);
    if (infoResult.data) {
      setClinicInfo({ ...SAMPLE_CLINIC_INFO, ...infoResult.data });
    }
    if (faqResult.data) {
      setFaqs(faqResult.data);
    }
    if (settingsResult.data) {
      setSettings({ ...DEFAULT_SETTINGS, ...settingsResult.data });
    }
  }, []);

  useEffect(() => {
    if (hashRoute.route === "embed" && hashRoute.slug) {
      loadPublicData(hashRoute.slug);
    }
  }, [hashRoute, loadPublicData]);

  async function handleLogout() {
    await signOut();
    setUser(null);
    setSelectedClinic(null);
    setClinics([]);
    window.location.hash = "#/admin/login";
  }

  const managedDeal = hashRoute.route === "admin/sales-demo-prospect" && hashRoute.slug
    ? getSalesDemoDeal(hashRoute.slug)
    : null;
  const managedSettings = managedDeal ? salesDemoDealToSettings(managedDeal) : null;
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setManagedScreenshotObjectUrl("");
    const storageKey = managedSettings?.prospectWebsiteScreenshotStorageKey;
    if (storageKey && hashRoute.route === "admin/sales-demo-prospect") {
      void getProspectScreenshot(storageKey).then((record) => {
        if (!active || !record) return;
        objectUrl = URL.createObjectURL(record.blob);
        setManagedScreenshotObjectUrl(objectUrl);
      }).catch(() => setManagedScreenshotObjectUrl(""));
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hashRoute.route, managedSettings?.prospectWebsiteScreenshotStorageKey]);
  const prospectClinicInfo: ClinicInfo = managedSettings ? {
    ...clinicInfo,
    clinicName: managedSettings.clinicName || clinicInfo.clinicName,
    doctorName: managedSettings.doctorName || clinicInfo.doctorName,
    departments: managedSettings.departments || clinicInfo.departments,
    phone: managedSettings.phone || clinicInfo.phone,
    postalCode: managedSettings.postalCode || clinicInfo.postalCode,
    address: managedSettings.address || clinicInfo.address,
    reservationUrl: managedSettings.reservationUrl || clinicInfo.reservationUrl,
    openingHours: managedSettings.openingHours || clinicInfo.openingHours,
    receptionHours: managedSettings.receptionHours || clinicInfo.receptionHours,
    closedDays: managedSettings.closedDays || clinicInfo.closedDays,
    access: managedSettings.access || clinicInfo.access,
    parking: managedSettings.parking || clinicInfo.parking,
    websiteUrl: managedSettings.websiteUrl || clinicInfo.websiteUrl,
    paymentMethods: managedSettings.paymentMethods || clinicInfo.paymentMethods,
    medicalServices: managedSettings.medicalServices || clinicInfo.medicalServices,
    examinations: managedSettings.examinations || clinicInfo.examinations,
    healthCheckups: managedSettings.healthCheckups || clinicInfo.healthCheckups,
    vaccinations: managedSettings.vaccinations || clinicInfo.vaccinations,
    feverInstructions: managedSettings.feverInstructions || clinicInfo.feverInstructions,
    firstVisitRequirements: managedSettings.firstVisitItems || clinicInfo.firstVisitRequirements,
  } : clinicInfo;
  const prospectChatSettings: ChatSettings = {
    ...settings,
    mainColor: managedSettings?.mainColor || settings.mainColor,
  };
  const prospectWebsiteUrl = normalizeProspectWebsiteUrl(managedSettings?.prospectWebsiteUrl ?? "");
  const publicProspectScreenshotUrl = normalizeProspectWebsiteUrl(managedSettings?.prospectWebsiteScreenshotUrl ?? "");
  let sharedProspectUrl: string | undefined;
  if (validateProspectWebsiteUrl(prospectWebsiteUrl)) {
    try {
      const encodedConfig = encodeSharedDemoConfig(createSharedDemoConfig({
        ...managedSettings!,
        prospectWebsiteUrl,
        prospectWebsiteScreenshotUrl: publicProspectScreenshotUrl,
        prospectPreviewMode: managedSettings!.prospectPreviewMode,
      }, []));
      sharedProspectUrl = `${window.location.origin + window.location.pathname}#/shared-demo/prospect?config=${encodeURIComponent(encodedConfig)}`;
    } catch {
      sharedProspectUrl = undefined;
    }
  }

  const sharedConfig = isSharedRoute && hashRoute.configPayload
    ? decodeSharedDemoConfig(hashRoute.configPayload)
    : null;
  const sharedClinicInfo = sharedConfig
    ? applySharedDemoConfigToClinicInfo({ ...SAMPLE_CLINIC_INFO, ...clinicInfo }, sharedConfig)
    : null;
  const sharedChatSettings: ChatSettings | null = sharedConfig
    ? { ...settings, mainColor: sharedConfig.mainColor ?? settings.mainColor }
    : null;
  const sharedFaqs = sharedConfig
    ? sharedDemoFaqsToFaqs(sharedConfig.faqs)
    : SAMPLE_FAQS;
  const salesFaqs = managedSettings ? salesDemoFaqsToFaqs(managedSettings.faqs).filter((faq) => faq.isPublished) : [];
  const prospectFaqs = salesFaqs;

  // Apply main color to CSS variable so non-Tailwind styles can use it
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--main-color",
      sharedChatSettings?.mainColor || (hashRoute.route === "admin/sales-demo-prospect" ? prospectChatSettings.mainColor : settings.mainColor) || "#3BA9D4",
    );
  }, [hashRoute.route, prospectChatSettings.mainColor, settings.mainColor, sharedChatSettings?.mainColor]);

  function handleUnanswered(question: string) {
    const next = [
      {
        id: uid(),
        question,
        timestamp: new Date().toISOString(),
        status: "unreviewed" as const,
      },
      ...unanswered,
    ];
    setUnanswered(next);
    storage.setUnanswered(next);
  }

  function handleResetConversation() {
    if (!confirm("会話をリセットしますか？現在のチャットメッセージがすべて削除されます。")) return;
    setHistory([]);
    storage.setHistory([]);
  }

  function handleReset() {
    if (!confirm("すべてのデータをサンプルデータにリセットしますか？編集内容は失われます。")) return;
    storage.resetToSampleData();
    setFaqs(SAMPLE_FAQS);
    setClinicInfo(storage.getClinicInfo());
    setSettings(DEFAULT_SETTINGS);
    setHistory([]);
    setUnanswered([]);
    window.location.reload();
  }

  function handleSharedResetConversation() {
    setSharedHistory([]);
  }

  if (isSharedRoute) {
    if (!sharedConfig || !sharedClinicInfo || !sharedChatSettings) {
      return <InvalidSharedDemo transparent={hashRoute.route === "shared-demo/embed"} />;
    }

    if (hashRoute.route === "shared-demo/embed") {
      return (
        <EmbedPage
          settings={sharedChatSettings}
          clinicInfo={sharedClinicInfo}
          faqs={sharedFaqs}
          history={sharedHistory}
          setHistory={setSharedHistory}
          onUnanswered={() => {}}
          onResetConversation={handleSharedResetConversation}
          clinicLogoUrl={sharedConfig.logoUrl}
          persistHistory={false}
        />
      );
    }

    if (hashRoute.route === "shared-demo/prospect") {
      if (!sharedConfig.prospectWebsiteUrl) {
        return <InvalidSharedDemo transparent={false} />;
      }
      return (
        <ProspectWebsitePreview
          key="shared-prospect-preview"
          websiteUrl={sharedConfig.prospectWebsiteUrl}
          websiteName={sharedConfig.prospectWebsiteName}
          screenshotUrl={sharedConfig.prospectWebsiteScreenshotUrl}
          previewMode={sharedConfig.prospectPreviewMode}
          settings={sharedChatSettings}
          clinicInfo={sharedClinicInfo}
          clinicLogoUrl={sharedConfig.logoUrl}
          faqs={sharedFaqs}
          history={sharedHistory}
          setHistory={setSharedHistory}
          onUnanswered={() => {}}
          onResetConversation={handleSharedResetConversation}
          showToolbar={false}
          persistHistory={false}
        />
      );
    }

    return (
      <SitePreviewPage
        settings={sharedChatSettings}
        clinicInfo={sharedClinicInfo}
        faqs={sharedFaqs}
        history={sharedHistory}
        setHistory={setSharedHistory}
        onUnanswered={() => {}}
        onResetConversation={handleSharedResetConversation}
        demoLogoUrl={sharedConfig.logoUrl}
        persistHistory={false}
      />
    );
  }

  if (hashRoute.route === "admin/sales-demo-prospect") {
    if (!managedDeal || !managedSettings || !validateProspectWebsiteUrl(prospectWebsiteUrl)) {
      return (
        <InvalidProspectPreview
          onConfigure={() => {
            window.location.hash = managedDeal ? `#/admin/sales-demos/${managedDeal.id}` : "#/admin/sales-demos";
          }}
        />
      );
    }
    return (
      <ProspectWebsitePreview
        key="managed-prospect-preview"
        websiteUrl={prospectWebsiteUrl}
        websiteName={managedSettings.prospectWebsiteName}
        screenshotUrl={managedScreenshotObjectUrl || (validateProspectScreenshotUrl(publicProspectScreenshotUrl) ? publicProspectScreenshotUrl : undefined)}
        previewMode={managedSettings.prospectPreviewMode}
        settings={prospectChatSettings}
        clinicInfo={prospectClinicInfo}
        clinicLogoUrl={managedSettings.logoUrl || undefined}
        faqs={prospectFaqs}
        history={history}
        setHistory={setHistory}
        onUnanswered={handleUnanswered}
        onResetConversation={handleResetConversation}
        showToolbar
        sharedUrl={sharedProspectUrl}
        onExit={() => { window.location.hash = `#/admin/sales-demos/${managedDeal.id}`; }}
        onChangeUrl={() => {
          window.location.hash = `#/admin/sales-demos/${managedDeal.id}?tab=prospect`;
        }}
        onRegisterScreenshot={() => { window.location.hash = `#/admin/sales-demos/${managedDeal.id}?tab=prospect`; }}
        onPreviewModeChange={(mode) => { updateSalesDemoDeal(managedDeal.id, { prospectPreviewMode: mode }); }}
      />
    );
  }

  // Embed route (with or without slug)
  if (hashRoute.route === "embed") {
    return (
      <EmbedPage
        settings={settings}
        clinicInfo={clinicInfo}
        faqs={faqs}
        history={history}
        setHistory={setHistory}
        onUnanswered={handleUnanswered}
        onResetConversation={handleResetConversation}
      />
    );
  }

  // Admin login route
  if (hashRoute.route === "admin/login") {
    if (!isSupabaseConfigured || isLocalDevelopment) {
      window.location.hash = "#/admin/sales-demos";
      return null;
    }
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-sky-500" size={32} />
        </div>
      );
    }
    if (user) {
      window.location.hash = "#/admin";
      return null;
    }
    return <LoginPage onLoggedIn={() => {}} />;
  }

  // Admin route — requires auth
  if (isAdminRoute(hashRoute.route) && isSupabaseConfigured && !isLocalDevelopment) {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-sky-500" size={32} />
        </div>
      );
    }
    if (!user) {
      return <LoginPage onLoggedIn={() => {}} />;
    }
    // Clinic loading states
    if (clinicLoading && clinics.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-sky-500" size={32} />
        </div>
      );
    }
    if (clinicError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="text-center max-w-sm">
            <p className="text-sm text-red-600 mb-3">{clinicError}</p>
            <button onClick={() => loadClinics()} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
              再読み込み
            </button>
          </div>
        </div>
      );
    }
    if (clinics.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="text-center max-w-sm">
            <Building2 size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-1">割り当てられたクリニックがありません。</p>
            <p className="text-xs text-slate-400">管理者にクリニックの割り当てを依頼してください。</p>
            <button onClick={handleLogout} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              ログアウト
            </button>
          </div>
        </div>
      );
    }
    // Clinic selector if multiple clinics and none selected
    if (clinics.length > 1 && !selectedClinic) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-slate-800 mb-4">クリニックを選択</h2>
            <div className="space-y-2">
              {clinics.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClinic(c)}
                  className="w-full flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-sky-300 hover:bg-sky-50 transition"
                >
                  <Building2 size={18} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-700">{c.name}</span>
                </button>
              ))}
            </div>
            <button onClick={handleLogout} className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700">
              ログアウト
            </button>
          </div>
        </div>
      );
    }
    if (!selectedClinic) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-sky-500" size={32} />
        </div>
      );
    }
  }

  // If admin route and we have a selected clinic, render admin with clinic context
  const adminClinicContext = isAdminRoute(hashRoute.route) && selectedClinic ? {
    clinicId: selectedClinic.id,
  } : undefined;

  return (
      <AdminPage
        faqs={faqs}
        setFaqs={setFaqs}
        clinicInfo={clinicInfo}
        setClinicInfo={setClinicInfo}
        settings={settings}
        setSettings={setSettings}
        history={history}
        unanswered={unanswered}
        setUnanswered={setUnanswered}
        onReset={handleReset}
        salesDemoId={hashRoute.route === "admin/sales-demo-deal" ? hashRoute.slug || undefined : undefined}
        initialSection={hashRoute.route === "admin/sales-demos" || hashRoute.route === "admin/sales-demo-deal" ? "sales-demo" : undefined}
        clinicId={adminClinicContext?.clinicId}
        headerActions={adminClinicContext && selectedClinic ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {clinics.length > 1 && (
              <div className="relative min-w-0 flex-1">
              <select
                value={selectedClinic.id}
                onChange={(e) => {
                  const c = clinics.find((c) => c.id === e.target.value);
                  if (c) setSelectedClinic(c);
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1 pl-3 pr-8 text-xs font-medium text-slate-600 focus:border-sky-400 focus:outline-none"
              >
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
            <button onClick={handleLogout} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100">
              <LogOut size={13} />
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        ) : undefined}
      />
  );
}

function InvalidSharedDemo({ transparent }: { transparent: boolean }) {
  useEffect(() => {
    if (!transparent) return;
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
    };
  }, [transparent]);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 text-center"
      style={{ background: transparent ? "transparent" : "#f8fafc" }}
    >
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-semibold text-slate-800">この商談デモURLは無効、または有効期限切れです。</p>
        <p className="mt-2 text-sm text-slate-500">担当者へ新しいURLをご確認ください。</p>
      </div>
    </main>
  );
}

function InvalidProspectPreview({ onConfigure }: { onConfigure: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-semibold text-slate-800">商談相手のホームページURLが正しくありません。</p>
        <p className="mt-2 text-sm text-slate-500">商談デモの編集画面からURLを確認してください。</p>
        <button
          type="button"
          onClick={onConfigure}
          className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          商談デモ設定を開く
        </button>
      </div>
    </main>
  );
}
