import type { AdapterSelectors, CouponApplicationResult, CouponTotal, MerchantAdapter } from "./types.js";

export function firstElement<T extends Element>(document: Document, selectors: string[]): T | null {
  for (const selector of selectors) {
    let element: T | null = null;
    try {
      element = document.querySelector<T>(selector);
    } catch {
      element = null;
    }
    if (element) return element;
  }
  return null;
}

export function firstButtonByText(document: Document, patterns: RegExp[]): HTMLElement | null {
  const buttons = [...document.querySelectorAll<HTMLElement>("button, a, [role='button']")];
  return buttons.find((button) => {
    const haystack = [
      button.textContent,
      button.getAttribute("aria-label"),
      button.getAttribute("data-testid"),
      button.id,
      button.className
    ]
      .filter(Boolean)
      .join(" ");
    return patterns.some((pattern) => pattern.test(haystack));
  }) ?? null;
}

export function readPriceMinor(text: string): CouponTotal | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  const currency = normalized.includes("€") || /\bEUR\b/i.test(normalized) ? "EUR" : "CZK";
  const match = normalized.match(/(\d{1,3}(?:[ .]\d{3})*|\d+)(?:[,.](\d{1,2}))?/);
  if (!match?.[1]) return null;
  const integer = Number(match[1].replace(/[ .]/g, ""));
  const decimal = Number((match[2] ?? "0").padEnd(2, "0").slice(0, 2));
  if (!Number.isFinite(integer)) return null;
  return { amountMinor: integer * 100 + decimal, currency };
}

export function createHeuristicAdapter(config: {
  id: string;
  merchantSlug: string;
  displayName: string;
  region?: MerchantAdapter["region"];
  domains: string[];
  selectors: AdapterSelectors;
  canAutoApply?: boolean;
}): MerchantAdapter {
  return {
    id: config.id,
    merchantSlug: config.merchantSlug,
    displayName: config.displayName,
    region: config.region ?? "CZ",
    domains: config.domains,
    canAutoApply: config.canAutoApply ?? true,
    detect(url, document) {
      const hostMatched = config.domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
      if (!hostMatched) return false;
      return config.selectors.checkoutPathHints.some((hint) => url.pathname.toLowerCase().includes(hint)) ||
        Boolean(config.selectors.couponAreaSelectors && firstElement(document, config.selectors.couponAreaSelectors)) ||
        Boolean(this.findCouponInput(document));
    },
    findCouponInput(document) {
      return firstElement<HTMLInputElement | HTMLTextAreaElement>(document, config.selectors.couponInputSelectors);
    },
    findApplyButton(document) {
      return firstElement<HTMLElement>(document, config.selectors.applyButtonSelectors) ??
        firstButtonByText(document, [/apply/i, /uplat/i, /použ/i, /pouzit/i, /vložit/i, /vlozit/i]);
    },
    readTotal(document) {
      const element = firstElement<HTMLElement>(document, config.selectors.totalSelectors);
      return element?.textContent ? readPriceMinor(element.textContent) : null;
    },
    async applyCoupon(document, code): Promise<CouponApplicationResult> {
      const before = this.readTotal(document) ?? undefined;
      const input = this.findCouponInput(document);
      const button = this.findApplyButton(document);
      if (!input || !button) {
        return {
          result: "failed_checkout_changed",
          before,
          message: "Coupon field or apply button was not found. Showing ranked codes instead."
        };
      }
      input.focus();
      input.value = code;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 700));
      const after = this.readTotal(document) ?? undefined;
      if (before && after && after.amountMinor < before.amountMinor) {
        return { result: "success", before, after, message: "Coupon lowered the checkout total." };
      }
      return { result: "failed_invalid", before, after, message: "Coupon did not reduce the detected total." };
    }
  };
}
