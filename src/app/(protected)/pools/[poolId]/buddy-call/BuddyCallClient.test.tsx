import { render, screen, act } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import { BuddyCallClient } from "./BuddyCallClient";

// Capture subscribe callback so tests can simulate connection status changes
let capturedSubscribeCb: ((status: string, err?: Error) => void) | null = null;

vi.mock("@/lib/supabase-browser", () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb: (status: string, err?: Error) => void) => {
        capturedSubscribeCb = cb;
        return {};
      }),
    })),
    removeChannel: vi.fn(),
    realtime: {
      stateChangeCallbacks: { open: [], close: [] },
    },
  },
}));

// Mock global fetch to return empty pairs by default
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ pairs: [] }),
});
vi.stubGlobal("fetch", mockFetch);

// ─── Shared test data ──────────────────────────────────────────────────────

const defaultProps = {
  sessionId: "session-1",
  poolId: "pool-1",
  poolName: "Main Pool",
};

type TestPair = {
  id: string;
  members: {
    camperId: string;
    firstName: string;
    lastName: string;
    bunk: string;
    code: string;
  }[];
};

const pair1: TestPair = {
  id: "pair-1",
  members: [
    { camperId: "c1", firstName: "Alice", lastName: "Smith", bunk: "B1", code: "AS1" },
    { camperId: "c2", firstName: "Bob", lastName: "Jones", bunk: "B2", code: "BJ1" },
  ],
};

const pair2: TestPair = {
  id: "pair-2",
  members: [
    { camperId: "c3", firstName: "Carol", lastName: "White", bunk: "B3", code: "CW1" },
    { camperId: "c4", firstName: "Dave", lastName: "Brown", bunk: "B4", code: "DB1" },
  ],
};

const trioPair: TestPair = {
  id: "pair-trio",
  members: [
    { camperId: "c5", firstName: "Ana", lastName: "Ruiz", bunk: "B5", code: "AR1" },
    { camperId: "c6", firstName: "Ben", lastName: "Cruz", bunk: "B6", code: "BC1" },
    { camperId: "c7", firstName: "Sam", lastName: "Lee", bunk: "B7", code: "SL1" },
  ],
};

// ─── Test 1: count display ─────────────────────────────────────────────────

describe("BuddyCallClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSubscribeCb = null;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ pairs: [] }),
    });
  });

  it("Test 1 (count display): renders swimmer count and pair count for 2 pairs of 2 members each", () => {
    render(
      <BuddyCallClient
        {...defaultProps}
        initialPairs={[pair1, pair2]}
      />,
    );

    // 4 total swimmers, 2 pairs
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("Test 2 (trio swimmer count): renders 3 swimmers and 1 pair for a trio", () => {
    render(
      <BuddyCallClient
        {...defaultProps}
        initialPairs={[trioPair]}
      />,
    );

    // 3 total swimmers, 1 pair
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("Test 3 (pair name format D-06): renders members joined by ' / '", () => {
    const namedPair: TestPair = {
      id: "named-pair",
      members: [
        { camperId: "x1", firstName: "Ana", lastName: "Ruiz", bunk: "B1", code: "AR1" },
        { camperId: "x2", firstName: "Ben", lastName: "Cruz", bunk: "B2", code: "BC1" },
      ],
    };

    render(
      <BuddyCallClient
        {...defaultProps}
        initialPairs={[namedPair]}
      />,
    );

    expect(screen.getByText("Ana Ruiz / Ben Cruz")).toBeInTheDocument();
  });

  it("Test 3 (trio name format): renders all three names joined by ' / '", () => {
    render(
      <BuddyCallClient
        {...defaultProps}
        initialPairs={[trioPair]}
      />,
    );

    expect(screen.getByText("Ana Ruiz / Ben Cruz / Sam Lee")).toBeInTheDocument();
  });

  it("Test 4 (empty state): renders 0 swimmers and 0 pairs with no pair list when initialPairs is empty", () => {
    render(
      <BuddyCallClient
        {...defaultProps}
        initialPairs={[]}
      />,
    );

    // Both swimmerCount and pairCount are 0 — two elements with "0"
    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(2);
    expect(screen.queryByRole("list", { name: /active pairs/i })).not.toBeInTheDocument();
  });

  it("Test 5 (connection banner): shows disconnected banner after window offline event", async () => {
    render(
      <BuddyCallClient
        {...defaultProps}
        initialPairs={[pair1]}
      />,
    );

    // No banner initially
    expect(screen.queryByText(/Disconnected — data may be stale\./)).not.toBeInTheDocument();

    // Dispatch offline event
    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByText(/Disconnected — data may be stale\./)).toBeInTheDocument();
  });
});
