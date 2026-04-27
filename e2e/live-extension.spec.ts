import { expect, test, chromium, type BrowserContext } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const merchantPages = [
  "https://www.alza.cz/Order1.htm",
  "https://www.notino.cz/cart/",
  "https://www.zalando.cz/cart/",
  "https://www.aboutyou.cz/checkout/basket"
];

test("built extension loads and talks to the production API on real merchant pages", async () => {
  test.setTimeout(120_000);
  const extensionPath = resolve("apps/extension/dist");
  const userDataDir = await mkdtemp(join(tmpdir(), "trust-coupons-extension-"));
  let context: BrowserContext | undefined;

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
    });

    let [serviceWorker] = context.serviceWorkers();
    serviceWorker ??= await context.waitForEvent("serviceworker", { timeout: 15_000 });
    expect(serviceWorker.url()).toContain("chrome-extension://");
    const extensionId = serviceWorker.url().split("/")[2];

    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await expect(optionsPage.locator("#apiBaseUrl")).toHaveValue("https://coupons-api.vvitovec.com");
    const configHealth = await optionsPage.evaluate(async () => {
      const response = await fetch("https://coupons-api.vvitovec.com/api/v1/extension-config");
      return { ok: response.ok, status: response.status };
    });
    expect(configHealth).toEqual({ ok: true, status: 200 });
    await optionsPage.close();

    const apiRequests: Record<string, string[]> = {};
    for (const url of merchantPages) {
      const page = await context.newPage();
      const seen: string[] = [];
      page.on("request", (request) => {
        const requestUrl = request.url();
        if (requestUrl.startsWith("https://coupons-api.vvitovec.com/api/v1/")) {
          seen.push(requestUrl);
        }
      });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(5_000);
      apiRequests[url] = seen;
      await page.close();
    }

    const resolvedMerchants = Object.values(apiRequests).flat().filter((url) => url.includes("/merchants/resolve"));
    expect(resolvedMerchants.length).toBeGreaterThanOrEqual(2);
  } finally {
    await context?.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
