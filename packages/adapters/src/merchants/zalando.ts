import { createHeuristicAdapter } from "../utils.js";

export const zalandoAdapter = createHeuristicAdapter({
  id: "eu.zalando.checkout.v1",
  merchantSlug: "zalando",
  displayName: "Zalando",
  domains: ["zalando.cz", "zalando.de", "zalando.com"],
  selectors: {
    checkoutPathHints: ["/cart", "/checkout", "/basket"],
    couponInputSelectors: [
      'input[name*="voucher" i]',
      'input[name*="coupon" i]',
      'input[placeholder*="voucher" i]',
      'input[placeholder*="promo" i]'
    ],
    applyButtonSelectors: ['button[type="submit"]', 'button[data-testid*="voucher" i]', 'button[aria-label*="Apply" i]'],
    totalSelectors: ['[data-testid*="total" i]', '[class*="total" i]', '[aria-label*="total" i]']
  }
});
