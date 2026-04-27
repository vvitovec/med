import { createHeuristicAdapter } from "../utils.js";

export const aboutYouAdapter = createHeuristicAdapter({
  id: "eu.about-you.checkout.v1",
  merchantSlug: "about-you",
  displayName: "About You",
  domains: ["aboutyou.cz", "aboutyou.com"],
  selectors: {
    checkoutPathHints: ["/checkout", "/cart", "/basket"],
    couponInputSelectors: [
      'input[name*="voucher" i]',
      'input[name*="coupon" i]',
      'input[placeholder*="voucher" i]',
      'input[placeholder*="slev" i]'
    ],
    applyButtonSelectors: ['button[type="submit"]', 'button[data-testid*="voucher" i]', 'button[class*="coupon" i]'],
    totalSelectors: ['[data-testid*="total" i]', '[class*="total" i]', '[class*="summary" i] [class*="price" i]']
  }
});
