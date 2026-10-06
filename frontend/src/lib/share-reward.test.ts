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

  it("explains a reward reduced by the free Fitken cap", () => {
    const message = shareClaimSuccessMessage({ rewardGranted: 2, rewardIntended: 3, rewardCapped: true, maxBalance: 50 });
    expect(message).toContain("Ví đã đạt trần 50 Fitken miễn phí nên chỉ cộng 2 Fitken");
    expect(message).toContain("Admin có thể thu hồi");
  });

  it("says the wallet is full when the cap blocked the reward", () => {
    expect(shareClaimSuccessMessage({ rewardGranted: 0, rewardIntended: 3, rewardCapped: true, maxBalance: 50 })).toBe(
      "Đã ghi nhận link chia sẻ. Ví đã đầy, không cộng thêm.",
    );
  });
});
