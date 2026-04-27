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
      'input[id*="voucher" i]',
      'input[id*="coupon" i]',
      'input[placeholder*="slev" i]',
      'input[placeholder*="promo" i]',
      'input[placeholder*="kód" i]',
      'input[placeholder*="kod" i]',
      'input[placeholder*="kupón" i]',
      'input[placeholder*="kupon" i]',
      'input[placeholder*="číslo" i]',
      'input[placeholder*="cislo" i]'
    ],
    applyButtonSelectors: [
      'button[type="submit"]',
      'button[data-testid*="voucher" i]',
      'button[data-testid*="coupon" i]',
      'button[class*="coupon" i]',
      'button[class*="voucher" i]',
      'button[class*="discount" i]'
    ],
    couponRevealSelectors: [
      'button[aria-controls*="coupon" i]',
      'button[aria-controls*="voucher" i]',
      'button[class*="coupon" i]',
      'button[class*="voucher" i]',
      'button[class*="discount" i]',
      'a[class*="coupon" i]',
      'a[class*="voucher" i]',
      'a[class*="discount" i]'
    ],
    couponAreaSelectors: ['[data-testid*="voucher" i]', '[data-testid*="coupon" i]', '[class*="voucher" i]', '[class*="coupon" i]'],
    totalSelectors: ['[data-testid*="total" i]', '[class*="summary" i] [class*="price" i]', '[class*="total" i]']
  }
});
