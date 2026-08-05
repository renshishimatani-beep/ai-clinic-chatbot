import type { FAQ, SalesDemoDeal, SalesDemoSettings } from "@/types";

export type ChromeDemoFAQ = Pick<FAQ, "id" | "category" | "question" | "answer" | "keywords" | "actionType"> & {
  actionLabel?: string;
  actionUrl?: string;
  sortOrder: number;
};

export type ChromeDemoConfig = {
  version: 1;
  dealId: string;
  clinicInfo: {
    clinicName: string;
    doctorName: string;
    departments: string;
    phone: string;
    postalCode: string;
    address: string;
    openingHours: string;
    closedDays: string;
    access: string;
    parking: string;
    reservationUrl: string;
    websiteUrl: string;
  };
  appearance: {
    mainColor: string;
    logoUrl: string;
  };
  faqs: ChromeDemoFAQ[];
};

export function createChromeDemoConfig(
  dealId: string,
  settings: SalesDemoDeal | SalesDemoSettings,
): ChromeDemoConfig {
  return {
    version: 1,
    dealId,
    clinicInfo: {
      clinicName: settings.clinicName,
      doctorName: settings.doctorName,
      departments: settings.departments,
      phone: settings.phone,
      postalCode: settings.postalCode,
      address: settings.address,
      openingHours: settings.openingHours,
      closedDays: settings.closedDays,
      access: settings.access,
      parking: settings.parking,
      reservationUrl: settings.reservationUrl,
      websiteUrl: settings.websiteUrl,
    },
    appearance: {
      mainColor: settings.mainColor,
      logoUrl: settings.logoUrl,
    },
    faqs: [...settings.faqs]
      .filter((faq) => faq.isPublished)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((faq) => ({
        id: faq.id,
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        keywords: [...faq.keywords],
        actionType: faq.actionType,
        actionLabel: faq.actionLabel || undefined,
        actionUrl: faq.actionUrl || undefined,
        sortOrder: faq.sortOrder ?? 0,
      })),
  };
}

export function stringifyChromeDemoConfig(dealId: string, settings: SalesDemoDeal | SalesDemoSettings): string {
  return JSON.stringify(createChromeDemoConfig(dealId, settings), null, 2);
}
