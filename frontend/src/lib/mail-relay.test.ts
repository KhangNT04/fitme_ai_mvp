import { describe, expect, it } from "vitest";
import { parseRelayMessage, secretMatches } from "./mail-relay";

describe("mail relay", () => {
  it("checks the shared secret", () => {
    expect(secretMatches("s3cret", "s3cret")).toBe(true);
    expect(secretMatches("s3cret", "s3cre")).toBe(false);
    expect(secretMatches("s3cret", undefined)).toBe(false);
    expect(secretMatches(undefined, "s3cret")).toBe(false);
  });

  it("accepts one recipient and sanitises headers", () => {
    const parsed = parseRelayMessage({
      to: " user@example.com ",
      subject: "Xác nhận\r\nBcc: evil@example.com",
      text: "Mã 123456",
      html: "<p>Mã 123456</p>",
      fromName: 'FitMe "AI" <x>',
    });
    expect(parsed).toEqual({
      to: "user@example.com",
      subject: "Xác nhận Bcc: evil@example.com",
      text: "Mã 123456",
      html: "<p>Mã 123456</p>",
      fromName: "FitMe AI x",
    });
  });

  it("rejects bulk or malformed recipients", () => {
    expect(parseRelayMessage({ to: "a@x.com, b@y.com", subject: "s", text: "t" })).toBe("invalid recipient");
    expect(parseRelayMessage({ to: "not-an-email", subject: "s", text: "t" })).toBe("invalid recipient");
    expect(parseRelayMessage({ to: "a@x.com", subject: "", text: "t" })).toBe("invalid subject");
    expect(parseRelayMessage({ to: "a@x.com", subject: "s" })).toBe("invalid text");
  });
});
