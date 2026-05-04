import { describe, expect, it } from "vitest";

/**
 * Mercado Pago credentials validation test.
 * Verifies that MP_ACCESS_TOKEN is set and well-formed (production tokens start with APP_USR-).
 * We do not make a live HTTP call from the sandbox (network may be restricted),
 * but we validate the token format and that the env var is present.
 */
describe("Mercado Pago credentials", () => {
  it("MP_ACCESS_TOKEN is set and non-empty", () => {
    const token = process.env.MP_ACCESS_TOKEN;
    expect(token, "MP_ACCESS_TOKEN must be set").toBeTruthy();
    expect(token!.length, "MP_ACCESS_TOKEN must be at least 20 chars").toBeGreaterThan(20);
  });

  it("MP_ACCESS_TOKEN looks like a valid MP token", () => {
    const token = process.env.MP_ACCESS_TOKEN ?? "";
    // Production tokens start with APP_USR- ; test tokens start with TEST-
    const isValid = token.startsWith("APP_USR-") || token.startsWith("TEST-");
    expect(isValid, `MP_ACCESS_TOKEN should start with APP_USR- (production) or TEST- (test). Got: ${token.substring(0, 12)}...`).toBe(true);
  });

  it("MP_WEBHOOK_SECRET is set and non-empty", () => {
    const secret = process.env.MP_WEBHOOK_SECRET;
    expect(secret, "MP_WEBHOOK_SECRET must be set").toBeTruthy();
    expect(secret!.length, "MP_WEBHOOK_SECRET must be at least 8 chars").toBeGreaterThanOrEqual(8);
  });
});
