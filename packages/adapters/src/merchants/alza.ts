import { createHeuristicAdapter } from "../utils.js";

export const alzaAdapter = createHeuristicAdapter({
  id: "cz.alza.checkout.v1",
  merchantSlug: "alza",
  displayName: "Alza",
  domains: ["alza.cz"],
  selectors: {
    checkoutPathHints: ["/order", "/order1", "/kosik", "/cart"],
    couponInputSelectors: [
      'input[name*="voucher" i]',
      'input[id*="voucher" i]',
      'input[name*="discount" i]',
      'input[id*="discount" i]',
      'input[placeholder*="slev" i]',
      'input[placeholder*="kup" i]',
      'input[placeholder*="kód" i]',
      'input[placeholder*="kod" i]'
    ],
    applyButtonSelectors: [
      'button[type="submit"]',
      'button:has([class*="voucher" i])',
      'button[class*="voucher" i]',
      'button[id*="voucher" i]',
      'input[type="submit"]'
    ],
    couponAreaSelectors: ['[class*="voucher" i]', '[id*="voucher" i]', '[class*="discount" i]', '[id*="discount" i]'],
    totalSelectors: ['[data-testid*="total" i]', '.price-box__price', '.totalPrice', '[class*="total" i]', '[id*="total" i]']
  }
});
