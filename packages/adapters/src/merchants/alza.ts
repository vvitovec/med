import { createHeuristicAdapter } from "../utils.js";

export const alzaAdapter = createHeuristicAdapter({
  id: "cz.alza.checkout.v1",
  merchantSlug: "alza",
  displayName: "Alza",
  domains: ["alza.cz"],
  selectors: {
    checkoutPathHints: ["/order", "/kosik", "/cart"],
    couponInputSelectors: [
      'input[name*="voucher" i]',
      'input[id*="voucher" i]',
      'input[placeholder*="slev" i]',
      'input[placeholder*="kup" i]'
    ],
    applyButtonSelectors: ['button[type="submit"]', 'button:has([class*="voucher" i])', 'input[type="submit"]'],
    totalSelectors: ['[data-testid*="total" i]', '.price-box__price', '.totalPrice', '[class*="total" i]']
  }
});
