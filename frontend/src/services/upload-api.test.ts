import { describe, expect, it, vi } from "vitest";

vi.mock("./api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api-client")>();
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
    unwrap: actual.unwrap,
  };
});

import apiClient from "./api-client";
import { uploadApi } from "./upload-api";

describe("upload-api", () => {
  it("normalizes quality check response", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { id: "abc", qualityStatus: "GOOD" } },
    });

    const result = await uploadApi.checkQuality("abc");
    expect(result.photoUploadId).toBe("abc");
    expect(result.canProceed).toBe(true);
    expect(result.quality).toBe("GOOD");
  });

  it("maps upload response id to photoUploadId", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { id: "upload-1" } },
    });

    const result = await uploadApi.uploadPhoto(new File(["x"], "photo.jpg", { type: "image/jpeg" }));
    expect(result.photoUploadId).toBe("upload-1");
  });

  it("treats PENDING quality as not yet proceedable", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { id: "pending-1", qualityStatus: "PENDING" } },
    });

    const result = await uploadApi.checkQuality("pending-1");
    expect(result.canProceed).toBe(false);
    expect(result.message).toContain("Đang kiểm tra");
  });
});
