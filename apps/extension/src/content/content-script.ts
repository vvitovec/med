import { adapterForUrl } from "@trust-coupons/adapters";
import type { CouponAttempt, MerchantSupportStatus, PrivacyMode, RankedCoupon } from "@trust-coupons/shared";
import "./overlay.css";

const defaultSettings = {
  apiBaseUrl: "https://coupons-api.vvitovec.com",
  privacyMode: "minimal" as PrivacyMode
};

type CheckoutState = {
  coupons: RankedCoupon[];
  merchantId: string;
  region: "CZ" | "EU" | "US";
  adapterId: string;
};

let checkoutState: CheckoutState | null = null;

async function loadContentSettings() {
  const stored = await chrome.storage.sync.get(defaultSettings);
  return { ...defaultSettings, ...stored };
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const settings = await loadContentSettings();
  const response = await fetch(`${settings.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json() as Promise<T>;
}

async function resolveMerchant(domain: string) {
  return apiRequest<MerchantSupportStatus>(`/api/v1/merchants/resolve?domain=${encodeURIComponent(domain)}`);
}

async function getCoupons(merchantId: string, region: "CZ" | "EU" | "US") {
  return apiRequest<{ coupons: RankedCoupon[] }>(`/api/v1/coupons?merchantId=${merchantId}&region=${region}`);
}

async function recordAttempt(attempt: CouponAttempt) {
  return apiRequest<{ ok: boolean; stored: boolean }>("/api/v1/coupon-attempts", {
    method: "POST",
    body: JSON.stringify(attempt)
  });
}

async function loadCheckoutState(): Promise<CheckoutState | null> {
  const adapter = adapterForUrl(new URL(location.href), document);
  if (!adapter) return null;
  const support = await resolveMerchant(location.hostname);
  if (!support.supported || !support.merchant) return null;
  const { coupons } = await getCoupons(support.merchant.id, support.merchant.region);
  if (coupons.length === 0) return null;
  return {
    coupons,
    merchantId: support.merchant.id,
    region: support.merchant.region,
    adapterId: adapter.id
  };
}

async function init() {
  checkoutState = await loadCheckoutState();
  if (!checkoutState) return;
  mountOverlay(checkoutState);
}

function mountOverlay(state: CheckoutState) {
  const existing = document.getElementById("trust-coupons-overlay");
  if (existing) return existing;
  const { coupons } = state;
  const root = document.createElement("div");
  root.id = "trust-coupons-overlay";
  const topCoupon = coupons[0];
  root.innerHTML = `
    <div class="tc-panel">
      <div class="tc-heading">
        <strong>Trust Coupons</strong>
        <button class="tc-close" aria-label="Close">x</button>
      </div>
      <p>${coupons.length} coupon${coupons.length === 1 ? "" : "s"} available. We test only after you ask.</p>
      <p class="tc-disclosure">Affiliate partners may pay us, but ranking ignores commission.</p>
      <div class="tc-actions">
        <button class="tc-primary">Test best coupons</button>
        <button class="tc-stop" hidden>Stop</button>
      </div>
      <details>
        <summary>Why this coupon?</summary>
        <p>${escapeHtml(topCoupon?.reason.summary ?? "Ranked by savings and success history.")}</p>
        <ul>${(topCoupon?.reason.factors ?? []).map((factor) => `<li>${escapeHtml(factor)}</li>`).join("")}</ul>
      </details>
      <div class="tc-progress" hidden></div>
    </div>
  `;
  document.documentElement.append(root);
  root.querySelector(".tc-close")?.addEventListener("click", () => root.remove());
  root.querySelector(".tc-primary")?.addEventListener("click", () => {
    void testCoupons(root, state);
  });
  return root;
}

async function openTester(runImmediately: boolean) {
  checkoutState ??= await loadCheckoutState();
  if (!checkoutState) return { ok: false, reason: "No active coupons were found for this checkout page." };
  const root = mountOverlay(checkoutState);
  root.scrollIntoView({ block: "nearest", inline: "nearest" });
  if (runImmediately) await testCoupons(root, checkoutState);
  return { ok: true };
}

async function testCoupons(root: HTMLElement, state: CheckoutState) {
  const { coupons, merchantId, region, adapterId } = state;
  const adapter = adapterForUrl(new URL(location.href), document);
  const progress = root.querySelector<HTMLElement>(".tc-progress");
  const stop = root.querySelector<HTMLButtonElement>(".tc-stop");
  if (!adapter || !progress) return;
  progress.hidden = false;
  if (stop) stop.hidden = false;
  let stopped = false;
  stop?.addEventListener("click", () => {
    stopped = true;
    progress.textContent = "Stopping after the current coupon.";
  }, { once: true });
  const settings = await loadContentSettings();
  let best: { code: string; savings: number } | null = null;
  for (const ranked of coupons.slice(0, 5)) {
    if (stopped) break;
    progress.textContent = `Testing ${ranked.coupon.code}`;
    const result = await adapter.applyCoupon(document, ranked.coupon.code);
    const savings =
      result.before && result.after ? Math.max(0, result.before.amountMinor - result.after.amountMinor) : 0;
    if (!best || savings > best.savings) best = { code: ranked.coupon.code, savings };
    if (settings.privacyMode !== "local_only") {
      await recordAttempt({
        merchantId,
        couponId: ranked.coupon.id,
        region,
        result: result.result,
        attemptedAt: new Date().toISOString(),
        currency: result.after?.currency ?? result.before?.currency ?? ranked.coupon.currency,
        finalTotalBeforeMinor: result.before?.amountMinor,
        finalTotalAfterMinor: result.after?.amountMinor,
        savingsMinor: savings,
        extensionVersion: chrome.runtime.getManifest().version,
        adapterId,
        privacyMode: settings.privacyMode
      });
    }
  }
  if (stop) stop.hidden = true;
  progress.textContent = best?.savings
    ? `Best detected code: ${best.code} saved ${formatMinorCurrency(best.savings, coupons[0]?.coupon.currency ?? "CZK")}.`
    : "No tested coupon reduced the detected total. Ranked codes remain visible.";
}

function formatMinorCurrency(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amountMinor / 100);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);
}

void init().catch(() => {
  // Content scripts must fail closed so checkout pages keep working.
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "trust-coupons:open-tester" && message?.type !== "trust-coupons:test-now") return false;
  openTester(message.type === "trust-coupons:test-now")
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, reason: error instanceof Error ? error.message : "Unknown error" }));
  return true;
});
