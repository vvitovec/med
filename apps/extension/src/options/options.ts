import type { PrivacyMode } from "@trust-coupons/shared";
import { loadSettings, saveSettings } from "../shared/settings.js";
import "./options.css";

const apiBaseUrl = document.getElementById("apiBaseUrl") as HTMLInputElement;
const status = document.getElementById("status")!;

async function init() {
  const settings = await loadSettings();
  apiBaseUrl.value = settings.apiBaseUrl;
  const radio = document.querySelector<HTMLInputElement>(`input[name="privacyMode"][value="${settings.privacyMode}"]`);
  if (radio) radio.checked = true;
}

document.getElementById("save")?.addEventListener("click", () => {
  const privacyMode = document.querySelector<HTMLInputElement>('input[name="privacyMode"]:checked')?.value as PrivacyMode;
  void saveSettings({ apiBaseUrl: apiBaseUrl.value, privacyMode }).then(() => {
    status.textContent = "Saved";
  });
});

void init();
