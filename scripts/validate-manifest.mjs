import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";

const manifest = JSON.parse(readFileSync("apps/extension/manifest.json", "utf8"));
const serialized = JSON.stringify(manifest);

if (manifest.manifest_version !== 3) {
  throw new Error("Chrome extension must use Manifest V3.");
}

if (serialized.includes("<all_urls>")) {
  throw new Error("Manifest must not request broad <all_urls> permissions.");
}

if (serialized.includes("webRequestBlocking")) {
  throw new Error("Manifest must not request blocking webRequest permissions.");
}

if (manifest.background?.service_worker?.startsWith("http")) {
  throw new Error("Manifest points at remote executable background code.");
}

for (const path of [
  manifest.action?.default_popup,
  manifest.options_page,
  manifest.background?.service_worker,
  ...(manifest.content_scripts?.flatMap((script) => [...(script.js ?? []), ...(script.css ?? [])]) ?? [])
].filter(Boolean)) {
  const builtPath = `apps/extension/dist/${path}`;
  const sourcePath = `apps/extension/${path}`;
  if (!existsSync(builtPath) && !existsSync(sourcePath)) {
    throw new Error(`Manifest path does not exist in source or build output: ${path}`);
  }
}

for (const script of manifest.content_scripts?.flatMap((entry) => entry.js ?? []) ?? []) {
  const builtPath = `apps/extension/dist/${script}`;
  if (!existsSync(builtPath)) continue;
  const content = readFileSync(builtPath, "utf8");
  if (/^\s*import\s/m.test(content) || /\bimport\(/.test(content)) {
    throw new Error(`Content script must be self-contained classic JS, not an ES module: ${script}`);
  }
}

console.log("Manifest validation passed.");
