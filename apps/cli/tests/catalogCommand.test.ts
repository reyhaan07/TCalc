import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { executeCatalogValidate } from "../src/commands/catalog.js";

// `catalog validate` also rejects a catalog older than 90 days, measured
// against the real clock, so these tests started failing 90 days after the
// bundled catalog's updatedAt. Pin "now" to that date: this suite checks the
// command's output, and validateCatalogFreshness has fixed-date tests of its own.
const bundledCatalogDate = JSON.parse(readFileSync("catalogs/models.json", "utf8")).updatedAt;

describe("catalog validate command", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${bundledCatalogDate}T12:00:00Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("validates valid catalog", async () => {
    // The bundled catalog from the workspace catalogs directory
    const result = await executeCatalogValidate({
      path: "catalogs/models.json",
    });
    expect(result.valid).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain("VALID");
  });

  it("emits JSON when requested", async () => {
    const result = await executeCatalogValidate({
      path: "catalogs/models.json",
      format: "json",
    });
    const payload = JSON.parse(result.message);
    expect(payload).toMatchObject({ valid: true, errors: [] });
    expect(payload.modelCount).toBeGreaterThanOrEqual(20);
  });

  it("fails on missing catalog", async () => {
    const result = await executeCatalogValidate({
      path: "catalogs/nonexistent.json",
    });
    expect(result.valid).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("No models found");
  });

  it("fails on invalid catalog path", async () => {
    const result = await executeCatalogValidate({
      path: "nonexistent/path/models.json",
    });
    expect(result.valid).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});
