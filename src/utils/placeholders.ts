import type { ClinicInfo } from "@/types";

const FALLBACK = "詳しくはクリニックへお問い合わせください。";

const PLACEHOLDER_KEYS: (keyof ClinicInfo)[] = [
  "clinicName",
  "doctorName",
  "departments",
  "postalCode",
  "address",
  "phone",
  "openingHours",
  "receptionHours",
  "closedDays",
  "access",
  "parking",
  "reservationUrl",
  "websiteUrl",
  "firstVisitRequirements",
  "paymentMethods",
  "medicalServices",
  "examinations",
  "healthCheckups",
  "vaccinations",
  "feverInstructions",
];

export function fillPlaceholders(text: string, info: ClinicInfo): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (!PLACEHOLDER_KEYS.includes(key as keyof ClinicInfo)) return match;
    const value = info[key as keyof ClinicInfo];
    if (value === undefined || value === null || String(value).trim() === "") {
      return FALLBACK;
    }
    return String(value);
  });
}
