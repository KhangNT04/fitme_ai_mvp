import { describe, expect, it } from "vitest";
import { shareClaimSuccessMessage } from "./share-reward";

describe("shareClaimSuccessMessage", () => {
  it("says the Fitken was credited immediately", () => {
    const message = shareClaimSuccessMessage(3);
    expect(message).toContain("Đã cộng 3 Fitken");
    expect(message).not.toContain("sẽ duyệt");
  });

  it("does not promise Fitken when nothing was granted", () => {
    expect(shareClaimSuccessMessage(0)).toBe("Đã ghi nhận link chia sẻ.");
  });
});
