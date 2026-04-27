import type { CouponAttempt, ExtensionConfig, MerchantSupportStatus, RankedCoupon } from "@trust-coupons/shared";
import { loadSettings } from "./settings.js";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const settings = await loadSettings();
  const response = await fetch(`${settings.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

export async function getExtensionConfig() {
  return request<ExtensionConfig>("/api/v1/extension-config");
}

export async function resolveMerchant(domain: string) {
  return request<MerchantSupportStatus>(`/api/v1/merchants/resolve?domain=${encodeURIComponent(domain)}`);
}

export async function getCoupons(merchantId: string, region: string) {
  return request<{ coupons: RankedCoupon[] }>(`/api/v1/coupons?merchantId=${merchantId}&region=${region}`);
}

export async function recordAttempt(attempt: CouponAttempt) {
  return request<{ ok: boolean; stored: boolean }>("/api/v1/coupon-attempts", {
    method: "POST",
    body: JSON.stringify(attempt)
  });
}
