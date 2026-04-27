import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("manifest compliance", () => {
  const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));

  it("uses Manifest V3 and no broad host permissions", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain("activeTab");
    expect(JSON.stringify(manifest.host_permissions)).not.toContain("<all_urls>");
    expect(JSON.stringify(manifest.optional_host_permissions)).not.toContain("<all_urls>");
  });

  it("does not allow remote executable code permissions", () => {
    expect(JSON.stringify(manifest.permissions)).not.toContain("webRequestBlocking");
    expect(manifest.content_security_policy).toBeUndefined();
  });

  it("declares bundled popup, options, and content CSS paths", () => {
    expect(manifest.action.default_popup).toBe("src/popup/popup.html");
    expect(manifest.options_page).toBe("src/options/options.html");
    expect(manifest.content_scripts[0].css).toContain("assets/content.css");
  });
});
