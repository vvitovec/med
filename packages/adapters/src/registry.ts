import type { MerchantAdapter } from "./types.js";
import { aboutYouAdapter } from "./merchants/about-you.js";
import { alzaAdapter } from "./merchants/alza.js";
import { notinoAdapter } from "./merchants/notino.js";
import { zalandoAdapter } from "./merchants/zalando.js";

export const bundledAdapters: MerchantAdapter[] = [alzaAdapter, notinoAdapter, zalandoAdapter, aboutYouAdapter];

export function adapterForUrl(url: URL, document: Document): MerchantAdapter | null {
  return bundledAdapters.find((adapter) => adapter.detect(url, document)) ?? null;
}

export function adapterById(id: string): MerchantAdapter | null {
  return bundledAdapters.find((adapter) => adapter.id === id) ?? null;
}
