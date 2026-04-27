import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { aboutYouAdapter, alzaAdapter, notinoAdapter } from "./index.js";

function doc(html: string) {
  return new JSDOM(html).window.document;
}

describe("merchant adapters", () => {
  it("detects checkout coupon fields", () => {
    const document = doc('<input name="voucherCode" /><button type="submit">Apply</button><strong data-testid="total">1 299 Kč</strong>');
    expect(alzaAdapter.detect(new URL("https://www.alza.cz/order"), document)).toBe(true);
    expect(alzaAdapter.findCouponInput(document)).not.toBeNull();
  });

  it("extracts totals as minor units", () => {
    const document = doc('<div data-testid="total">2 499,90 Kč</div>');
    expect(notinoAdapter.readTotal(document)).toEqual({ amountMinor: 249990, currency: "CZK" });
  });

  it("falls back safely when apply controls are missing", async () => {
    const document = doc('<div data-testid="total">999 Kč</div>');
    await expect(alzaAdapter.applyCoupon(document, "TEST")).resolves.toMatchObject({
      result: "failed_checkout_changed"
    });
  });

  it("detects Alza live cart path", () => {
    const document = doc("<main><h1>Košík</h1></main>");
    expect(alzaAdapter.detect(new URL("https://www.alza.cz/Order1.htm"), document)).toBe(true);
  });

  it("detects About You coupon wallet surfaces", () => {
    const document = doc('<button data-testid="HeaderCouponWalletButton" aria-label="Otevřít kupónovou peněženku">1</button>');
    expect(aboutYouAdapter.detect(new URL("https://www.aboutyou.cz/checkout/basket"), document)).toBe(true);
  });
});
