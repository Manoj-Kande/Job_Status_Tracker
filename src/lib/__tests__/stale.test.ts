import { describe, it, expect } from "vitest";
import { isStale, suggestFollowUpDate, isClosedStatus } from "@/lib/stale";

describe("isClosedStatus", () => {
  it("treats REJECTED and OFFER_ACCEPTED as closed", () => {
    expect(isClosedStatus("REJECTED")).toBe(true);
    expect(isClosedStatus("OFFER_ACCEPTED")).toBe(true);
  });
  it("treats TO_APPLY as not closed", () => {
    expect(isClosedStatus("TO_APPLY")).toBe(false);
  });
});

describe("suggestFollowUpDate", () => {
  it("suggests +3 days for REFERRAL_REQUESTED", () => {
    const result = suggestFollowUpDate("REFERRAL_REQUESTED")!;
    const diffDays = Math.round((result.getTime() - Date.now()) / 86_400_000);
    expect(diffDays).toBe(3);
  });
  it("suggests +7 days for APPLIED_DIRECT", () => {
    const result = suggestFollowUpDate("APPLIED_DIRECT")!;
    const diffDays = Math.round((result.getTime() - Date.now()) / 86_400_000);
    expect(diffDays).toBe(7);
  });
  it("returns null for statuses with no auto-followup rule", () => {
    expect(suggestFollowUpDate("TO_APPLY")).toBeNull();
  });
});

describe("isStale", () => {
  const fourteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

  it("flags a job with no update in 14+ days as stale", () => {
    expect(
      isStale({ applicationStatus: "APPLIED_DIRECT", archived: false, updatedAt: fourteenDaysAgo, nextFollowUpDate: null })
    ).toBe(true);
  });
  it("does not flag archived jobs", () => {
    expect(
      isStale({ applicationStatus: "APPLIED_DIRECT", archived: true, updatedAt: fourteenDaysAgo, nextFollowUpDate: null })
    ).toBe(false);
  });
  it("does not flag closed jobs", () => {
    expect(
      isStale({ applicationStatus: "REJECTED", archived: false, updatedAt: fourteenDaysAgo, nextFollowUpDate: null })
    ).toBe(false);
  });
  it("does not flag jobs with an upcoming follow-up", () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    expect(
      isStale({ applicationStatus: "APPLIED_DIRECT", archived: false, updatedAt: fourteenDaysAgo, nextFollowUpDate: future })
    ).toBe(false);
  });
});
