import { resolveMerchant } from "../shared/api.js";
import "./popup.css";

const state = document.getElementById("state")!;
const summary = document.getElementById("summary")!;
const test = document.getElementById("test") as HTMLButtonElement;

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    state.textContent = "No tab";
    test.disabled = true;
    return;
  }
  if (!tab.url) return;
  const url = new URL(tab.url);
  const support = await resolveMerchant(url.hostname);
  if (!support.supported || !support.merchant) {
    state.textContent = "Unsupported";
    summary.textContent = "This store is not in the pilot adapter list yet.";
    test.disabled = true;
    return;
  }
  state.textContent = "Supported";
  summary.textContent = `${support.merchant.displayName} is supported. The checkout overlay will ask before testing coupons.`;
  test.onclick = () => chrome.tabs.reload(tab.id!);
}

void init().catch((error) => {
  state.textContent = "Offline";
  summary.textContent = error.message;
  test.disabled = true;
});
