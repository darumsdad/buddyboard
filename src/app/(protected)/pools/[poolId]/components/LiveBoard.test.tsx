import { describe, it } from "vitest";

// Wave 0 stub — component LiveBoard.tsx is created in Plan 05-02.
// These stubs keep npm test green while enabling gate-grep by requirement ID.

describe("BOARD-01", () => {
  it.todo(
    "renders the SSR initialPairs snapshot immediately without a loading gap",
  );
});

describe("BOARD-02", () => {
  it.todo(
    "derives swimmerCount as sum of member counts and pairCount as pair list length",
  );
});

describe("BOARD-05", () => {
  it.todo("shows 'No pairs checked in yet' when connected and empty");
  it.todo("keeps last-known pairs visible when disconnected");
});
