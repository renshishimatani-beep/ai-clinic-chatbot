export type FAQ = {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  actionType: "none" | "phone" | "reservation" | "link";
  actionLabel?: string;
  actionUrl?: string;
  isPublished: boolean;
  updatedAt: string;
  sortOrder?: number;
};

export type SalesDemoFAQ = Omit<FAQ, "sortOrder"> & {
  sortOrder: number;
  origin?: "manual" | "external-ai";
  sourceTitle?: string;
  sourceUrl?: string;
};

export type SalesDemoWebsiteSource = {
  id: string;
  title: string;
  url?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ImportedFAQ = {
  id: string;
  selected: boolean;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  actionType: FAQ["actionType"];
  actionLabel?: string;
  actionUrl?: string;
  isPublished: boolean;
  sourceTitle?: string;
  sourceUrl?: string;
};

export type ImportedClinicInfo = {
  clinicName?: string;
  doctorName?: string;
  departments?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  openingHours?: string;
  receptionHours?: string;
  closedDays?: string;
  access?: string;
  parking?: string;
  reservationUrl?: string;
  websiteUrl?: string;
  paymentMethods?: string;
  medicalServices?: string;
  examinations?: string;
  healthCheckups?: string;
  vaccinations?: string;
  feverInstructions?: string;
  firstVisitItems?: string;
};

export type ImportedSourcePage = { title: string; url: string };

export type ClinicInfo = {
  clinicName: string;
  doctorName: string;
  departments: string;
  postalCode: string;
  address: string;
  phone: string;
  openingHours: string;
  receptionHours: string;
  closedDays: string;
  access: string;
  parking: string;
  reservationUrl: string;
  websiteUrl: string;
  firstVisitRequirements: string;
  paymentMethods: string;
  medicalServices: string;
  examinations: string;
  healthCheckups: string;
  vaccinations: string;
  feverInstructions: string;
};

export type ChatSettings = {
  mainColor: string;
  welcomeMessage: string;
  disclaimer: string;
  fallbackMessage: string;
  showPhoneButton: boolean;
  showReservationButton: boolean;
  showCharacter: boolean;
};

export type ChatRole = "user" | "bot";

export type MessageAction = {
  type: "phone" | "reservation" | "link" | "topic";
  label: string;
  url?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
  matchedFaqId?: string;
  matchedFaqQuestion?: string;
  answered: boolean;
  action?: MessageAction;
};

export type ProspectPreviewMode = "auto" | "iframe" | "screenshot";

export type SalesDemoSettings = {
  dataVersion: 6;
  clinicName: string;
  doctorName: string;
  departments: string;
  phone: string;
  postalCode: string;
  address: string;
  reservationUrl: string;
  websiteUrl: string;
  mainColor: string;
  logoUrl: string;
  openingHours: string;
  receptionHours: string;
  closedDays: string;
  access: string;
  parking: string;
  paymentMethods: string;
  medicalServices: string;
  examinations: string;
  healthCheckups: string;
  vaccinations: string;
  feverInstructions: string;
  firstVisitItems: string;
  prospectWebsiteUrl: string;
  prospectWebsiteName: string;
  prospectWebsiteScreenshotUrl: string;
  prospectWebsiteScreenshotStorageKey: string;
  prospectPreviewMode: ProspectPreviewMode;
  websiteSources: SalesDemoWebsiteSource[];
  generatedFaqPrompt: string;
  lastImportedAiResponse: string;
  importedFaqCandidates: ImportedFAQ[];
  importedClinicInfoCandidate: ImportedClinicInfo;
  importedSourcePages: ImportedSourcePage[];
  faqs: SalesDemoFAQ[];
  salesMemo: string;
};

export type SalesDemoStatus = "draft" | "scheduled" | "presented" | "won" | "lost" | "archived";

export type SalesDemoDeal = {
  id: string;
  dealName: string;
  clinicName: string;
  doctorName: string;
  departments: string;
  phone: string;
  postalCode: string;
  address: string;
  openingHours: string;
  receptionHours: string;
  closedDays: string;
  access: string;
  parking: string;
  paymentMethods: string;
  medicalServices: string;
  examinations: string;
  healthCheckups: string;
  vaccinations: string;
  feverInstructions: string;
  firstVisitItems: string;
  reservationUrl: string;
  websiteUrl: string;
  mainColor: string;
  logoUrl: string;
  prospectWebsiteUrl: string;
  prospectWebsiteName: string;
  prospectWebsiteScreenshotUrl: string;
  prospectWebsiteScreenshotStorageKey: string;
  prospectPreviewMode: ProspectPreviewMode;
  websiteSources: SalesDemoWebsiteSource[];
  generatedFaqPrompt: string;
  lastImportedAiResponse: string;
  importedFaqCandidates: ImportedFAQ[];
  importedClinicInfoCandidate: ImportedClinicInfo;
  importedSourcePages: ImportedSourcePage[];
  internalMemo: string;
  faqs: SalesDemoFAQ[];
  status: SalesDemoStatus;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
};

export type UnansweredStatus = "unreviewed" | "reviewing" | "faq_added" | "ignored";

export type UnansweredQuestion = {
  id: string;
  question: string;
  timestamp: string;
  status: UnansweredStatus;
};
