import { getCoupons, recordAttempt, resolveMerchant } from "../shared/api.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    privacyMode: "minimal",
    apiBaseUrl: "https://coupons-api.vvitovec.com"
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "resolve-current-tab") {
    resolveMerchant(message.domain)
      .then(sendResponse)
      .catch((error) => sendResponse({ supported: false, error: error.message }));
    return true;
  }

  if (message?.type === "get-coupons") {
    getCoupons(message.merchantId, message.region)
      .then(sendResponse)
      .catch((error) => sendResponse({ coupons: [], error: error.message }));
    return true;
  }

  if (message?.type === "record-attempt") {
    recordAttempt(message.attempt)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, stored: false, error: error.message }));
    return true;
  }

  return false;
});
