import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PairRow } from "./PairRow";

// Mock the actions module
vi.mock("../actions", () => ({
  removePairAction: vi.fn(),
}));

const makePair = () => ({
  id: "pair-1",
  members: [
    {
      camperId: "c1",
      firstName: "Alice",
      lastName: "Smith",
      bunk: "1",
      code: "A01",
    },
    {
      camperId: "c2",
      firstName: "Bob",
      lastName: "Jones",
      bunk: "2",
      code: "B02",
    },
  ],
});

describe("PairRow — onRemoved callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls onRemoved exactly once when removePairAction resolves successfully", async () => {
    const { removePairAction } = await import("../actions");
    vi.mocked(removePairAction).mockResolvedValueOnce(undefined);

    const onRemoved = vi.fn();
    render(
      <PairRow
        pair={makePair()}
        sessionId="sess-1"
        poolId="pool-1"
        onRemoved={onRemoved}
      />,
    );

    fireEvent.click(screen.getByTitle("Remove pair"));

    await waitFor(() => {
      expect(onRemoved).toHaveBeenCalledTimes(1);
    });
  });

  it("does NOT call onRemoved and shows error when removePairAction throws", async () => {
    const { removePairAction } = await import("../actions");
    vi.mocked(removePairAction).mockRejectedValueOnce(
      new Error("DB error"),
    );

    const onRemoved = vi.fn();
    render(
      <PairRow
        pair={makePair()}
        sessionId="sess-1"
        poolId="pool-1"
        onRemoved={onRemoved}
      />,
    );

    fireEvent.click(screen.getByTitle("Remove pair"));

    await waitFor(() => {
      expect(
        screen.getByRole("alert"),
      ).toBeInTheDocument();
    });
    expect(onRemoved).not.toHaveBeenCalled();
  });
});
