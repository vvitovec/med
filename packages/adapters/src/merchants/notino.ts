import { createHeuristicAdapter } from "../utils.js";

export const notinoAdapter = createHeuristicAdapter({
  id: "cz.notino.checkout.v1",
  merchantSlug: "notino",
  displayName: "Notino",
  domains: ["notino.cz"],
  selectors: {
    checkoutPathHints: ["/kosik", "/objednavka", "/checkout", "/cart"],
    couponInputSelectors: [
      'input[name*="voucher" i]',
      'input[name*="coupon" i]',
      'input[placeholder*="slev" i]',
      'input[placeholder*="promo" i]'
    ],
    applyButtonSelectors: ['button[type="submit"]', 'button[data-testid*="voucher" i]', 'button[class*="coupon" i]'],
    totalSelectors: ['[data-testid*="total" i]', '[class*="summary" i] [class*="price" i]', '[class*="total" i]']
  }
});
