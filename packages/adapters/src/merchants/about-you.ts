import { createHeuristicAdapter } from "../utils.js";

export const aboutYouAdapter = createHeuristicAdapter({
  id: "eu.about-you.checkout.v1",
  merchantSlug: "about-you",
  displayName: "About You",
  region: "EU",
  domains: ["aboutyou.cz", "aboutyou.com"],
  selectors: {
    checkoutPathHints: ["/checkout", "/cart", "/basket"],
    couponInputSelectors: [
      'input[name*="voucher" i]',
      'input[name*="coupon" i]',
      'input[id*="voucher" i]',
      'input[id*="coupon" i]',
      'input[placeholder*="voucher" i]',
      'input[placeholder*="slev" i]',
      'input[placeholder*="kupón" i]',
      'input[placeholder*="kupon" i]'
    ],
    applyButtonSelectors: [
      'button[type="submit"]',
      'button[data-testid*="voucher" i]',
      'button[data-testid*="coupon" i]',
      'button[class*="coupon" i]',
      'button[aria-label*="kupón" i]'
    ],
    couponAreaSelectors: [
      '[data-testid="HeaderCouponWalletButton"]',
      '[data-testid*="voucher" i]',
      '[data-testid*="coupon" i]',
      '[class*="coupon" i]'
    ],
    totalSelectors: ['[data-testid*="total" i]', '[class*="total" i]', '[class*="summary" i] [class*="price" i]', '[data-testid*="price" i]']
  }
});
