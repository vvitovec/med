import { LOCAL_API_BASE_URL, PUBLIC_PRODUCTION_API_BASE_URL } from "@trust-coupons/config";
import type { PrivacyMode } from "@trust-coupons/shared";

export interface ExtensionSettings {
  apiBaseUrl: string;
  privacyMode: PrivacyMode;
}

export const defaultSettings: ExtensionSettings = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || PUBLIC_PRODUCTION_API_BASE_URL || LOCAL_API_BASE_URL,
  privacyMode: "minimal"
};

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get(defaultSettings);
  return { ...defaultSettings, ...stored };
}

export async function saveSettings(settings: ExtensionSettings) {
  await chrome.storage.sync.set(settings);
}
