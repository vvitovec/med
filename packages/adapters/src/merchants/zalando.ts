import { createHeuristicAdapter } from "../utils.js";

export const zalandoAdapter = createHeuristicAdapter({
  id: "eu.zalando.checkout.v1",
  merchantSlug: "zalando",
  displayName: "Zalando",
  region: "EU",
  domains: ["zalando.cz", "zalando.de", "zalando.com"],
  selectors: {
    checkoutPathHints: ["/cart", "/checkout", "/basket"],
    couponInputSelectors: [
      'input[name*="voucher" i]',
      'input[name*="coupon" i]',
      'input[id*="voucher" i]',
      'input[id*="coupon" i]',
      'input[placeholder*="voucher" i]',
      'input[placeholder*="promo" i]',
      'input[placeholder*="slev" i]',
      'input[placeholder*="kód" i]'
    ],
    applyButtonSelectors: [
      'button[type="submit"]',
      'button[data-testid*="voucher" i]',
      'button[data-testid*="coupon" i]',
      'button[aria-label*="Apply" i]',
      'button[aria-label*="Uplat" i]'
    ],
    couponAreaSelectors: ['[data-testid*="voucher" i]', '[data-testid*="coupon" i]', '[class*="voucher" i]', '[class*="coupon" i]'],
    totalSelectors: ['[data-testid*="total" i]', '[class*="total" i]', '[aria-label*="total" i]', '[data-testid*="price" i]']
  }
});
