import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  clearGuestBodyProfile,
  getGuestBodyProfile,
  isBodyProfileReady,
  saveGuestBodyProfile,
  GUEST_BODY_PROFILE_KEY,
} from "@/lib/local-profile-storage";
import { isTtlExpired, readTtlStorage, writeTtlStorage } from "@/lib/ttl-storage";
import type { BodyProfile } from "@/types/user";

const readyProfile: BodyProfile = {
  heightCm: 165,
  weightKg: 55,
  age: 25,
  gender: "FEMALE",
  fitPreference: "REGULAR",
};

describe("isBodyProfileReady", () => {
  it("requires height, weight, age, gender, fitPreference", () => {
    expect(isBodyProfileReady(readyProfile)).toBe(true);
    expect(isBodyProfileReady({ ...readyProfile, age: undefined })).toBe(false);
    expect(isBodyProfileReady(null)).toBe(false);
  });
});

describe("guest body profile TTL storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("saves and reads guest profile", () => {
    saveGuestBodyProfile(readyProfile);
    expect(getGuestBodyProfile()).toEqual(readyProfile);
  });

  it("expires after 30 days", () => {
    writeTtlStorage(GUEST_BODY_PROFILE_KEY, readyProfile);
    const raw = JSON.parse(localStorage.getItem(GUEST_BODY_PROFILE_KEY)!);
    expect(isTtlExpired(raw.savedAt - 1)).toBe(false);

    vi.useFakeTimers();
    vi.setSystemTime(raw.savedAt + 31 * 24 * 60 * 60 * 1000);
    expect(readTtlStorage(GUEST_BODY_PROFILE_KEY)).toBeNull();
    expect(getGuestBodyProfile()).toBeNull();
  });

  it("clears guest profile", () => {
    saveGuestBodyProfile(readyProfile);
    clearGuestBodyProfile();
    expect(getGuestBodyProfile()).toBeNull();
  });
});
