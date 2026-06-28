import { render, screen, act } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import { LiveBoard } from "./LiveBoard";

// Capture the subscribe callback so tests can simulate connection status changes
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
  },
}));

// Mock the server actions to prevent loading server-only modules (auth, db, next/headers)
vi.mock("../actions", () => ({
  addPairAction: vi.fn().mockResolvedValue({ success: true }),
  removePairAction: vi.fn().mockResolvedValue(undefined),
  closeSessionAction: vi.fn().mockResolvedValue(undefined),
  searchCampersAction: vi.fn().mockResolvedValue([]),
}));

// Mock auth-client used by LogoutButton
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock next/navigation used by LogoutButton and JoinSessionModal
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// ─── Shared test data ───────────────────────────────────────────────────────

const defaultProps = {
  sessionId: "session-1",
  poolId: "pool-1",
  poolName: "Main Pool",
};

const pairOf2: { id: string; members: { camperId: string; firstName: string; lastName: string; bunk: string; code: string }[] } = {
  id: "pair-1",
  members: [
    { camperId: "c1", firstName: "Alice", lastName: "Smith", bunk: "B1", code: "AS1" },
    { camperId: "c2", firstName: "Bob", lastName: "Jones", bunk: "B2", code: "BJ1" },
  ],
};

const pairOf3: { id: string; members: { camperId: string; firstName: string; lastName: string; bunk: string; code: string }[] } = {
  id: "pair-2",
  members: [
    { camperId: "c3", firstName: "Carol", lastName: "White", bunk: "B3", code: "CW1" },
    { camperId: "c4", firstName: "Dave", lastName: "Brown", bunk: "B4", code: "DB1" },
    { camperId: "c5", firstName: "Eve", lastName: "Green", bunk: "B5", code: "EG1" },
  ],
};

// ─── BOARD-01 ────────────────────────────────────────────────────────────────

describe("BOARD-01", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSubscribeCb = null;
  });

  it("renders both initialPairs members immediately without any async wait", () => {
    render(
      <LiveBoard
        {...defaultProps}
        initialPairs={[pairOf2, pairOf3]}
      />,
    );

    // All five members should appear in the DOM immediately (SSR snapshot = initial state)
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/Carol/)).toBeInTheDocument();
    expect(screen.getByText(/Dave/)).toBeInTheDocument();
    expect(screen.getByText(/Eve/)).toBeInTheDocument();
  });
});

// ─── BOARD-02 ────────────────────────────────────────────────────────────────

describe("BOARD-02", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSubscribeCb = null;
  });

  it("shows '5 swimmers · 2 pairs' in the header when initialPairs has 2 + 3 members", () => {
    render(
      <LiveBoard
        {...defaultProps}
        initialPairs={[pairOf2, pairOf3]}
      />,
    );

    // swimmerCount = 2 + 3 = 5, pairCount = 2
    // The count appears in two DOM elements (md+ inline block + mobile stacked row)
    const countEls = screen.getAllByText(/5 swimmers · 2 pairs/);
    expect(countEls.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── BOARD-05 ────────────────────────────────────────────────────────────────

describe("BOARD-05", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSubscribeCb = null;
  });

  it("shows empty state when connected and shows disconnected banner on CHANNEL_ERROR", async () => {
    render(
      <LiveBoard
        {...defaultProps}
        initialPairs={[]}
      />,
    );

    // After SUBSCRIBED, empty state renders and ConnectionBanner is absent
    await act(async () => {
      capturedSubscribeCb?.("SUBSCRIBED");
    });

    expect(screen.getByText("No pairs checked in yet")).toBeInTheDocument();
    expect(screen.queryByText(/Disconnected/)).not.toBeInTheDocument();

    // After CHANNEL_ERROR, disconnected banner appears
    await act(async () => {
      capturedSubscribeCb?.("CHANNEL_ERROR");
    });

    expect(screen.getByText(/Disconnected — data may be stale\./)).toBeInTheDocument();
  });
});
