import type { SalesDemoDeal } from "@/types";
import { salesDemoDealToSettings } from "@/services/salesDemoRepository";
import {
  createSharedDemoConfig,
  encodeSharedDemoConfig,
  normalizeProspectWebsiteUrl,
  validateProspectWebsiteUrl,
} from "@/utils/sharedDemoConfig";

export function createSharedConfigFromDeal(deal: SalesDemoDeal) {
  // 通常FAQへフォールバックせず、選択した商談の公開FAQだけを共有する。
  return createSharedDemoConfig(salesDemoDealToSettings(deal), []);
}

export function createProspectPreviewUrl(deal: SalesDemoDeal): string {
  const prospectWebsiteUrl = normalizeProspectWebsiteUrl(deal.prospectWebsiteUrl);
  if (!validateProspectWebsiteUrl(prospectWebsiteUrl)) {
    throw new Error("商談相手のホームページURLが正しくありません。");
  }
  const baseUrl = window.location.origin + window.location.pathname;
  const encodedConfig = encodeSharedDemoConfig(createSharedConfigFromDeal({ ...deal, prospectWebsiteUrl }));
  return `${baseUrl}#/shared-demo/prospect?config=${encodeURIComponent(encodedConfig)}`;
}
