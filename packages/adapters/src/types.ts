import type { CouponAttemptResult, Region } from "@trust-coupons/shared";

export interface CouponTotal {
  amountMinor: number;
  currency: string;
}

export interface CouponApplicationResult {
  result: CouponAttemptResult;
  before?: CouponTotal | undefined;
  after?: CouponTotal | undefined;
  message: string;
}

export interface MerchantAdapter {
  id: string;
  merchantSlug: string;
  displayName: string;
  region: Region;
  domains: string[];
  canAutoApply: boolean;
  detect(url: URL, document: Document): boolean;
  findCouponInput(document: Document): HTMLInputElement | HTMLTextAreaElement | null;
  findApplyButton(document: Document): HTMLElement | null;
  readTotal(document: Document): CouponTotal | null;
  applyCoupon(document: Document, code: string): Promise<CouponApplicationResult>;
}

export interface AdapterSelectors {
  checkoutPathHints: string[];
  couponInputSelectors: string[];
  applyButtonSelectors: string[];
  couponRevealSelectors?: string[];
  couponAreaSelectors?: string[];
  totalSelectors: string[];
}
