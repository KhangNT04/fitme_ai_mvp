import { describe, expect, it } from "vitest";
import { isJwtExpired } from "./jwt-expiry";

function makeToken(expSecondsFromNow: number): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }),
  );
  return `${header}.${payload}.sig`;
}

describe("isJwtExpired", () => {
  it("treats empty token as expired", () => {
    expect(isJwtExpired(null)).toBe(true);
    expect(isJwtExpired("")).toBe(true);
  });

  it("detects expired tokens", () => {
    expect(isJwtExpired(makeToken(-60))).toBe(true);
  });

  it("accepts fresh tokens", () => {
    expect(isJwtExpired(makeToken(3600))).toBe(false);
  });
});
