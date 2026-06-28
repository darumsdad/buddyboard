import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddPairForm } from "./AddPairForm";
import type { CamperSuggestion } from "../actions";

// Mock the actions module
vi.mock("../actions", () => ({
  addPairAction: vi.fn(),
  searchCampersAction: vi.fn(),
}));

// Mock CamperField so tests can control resolved camper without UI interaction
vi.mock("./CamperField", () => ({
  CamperField: ({
    label,
    onResolved,
  }: {
    label: string;
    onResolved: (c: CamperSuggestion | null) => void;
  }) => (
    <button
      type="button"
      data-testid={`resolve-${label.toLowerCase().replace(" ", "-")}`}
      onClick={() =>
        onResolved({
          id: `${label}-id`,
          firstName: label,
          lastName: "Test",
          bunk: "1",
          code: "A01",
        })
      }
    >
      {label}
    </button>
  ),
}));

describe("AddPairForm — onSuccess callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls onSuccess exactly once when addPairAction returns { success: true }", async () => {
    const { addPairAction } = await import("../actions");
    vi.mocked(addPairAction).mockResolvedValueOnce({ success: true });

    const onSuccess = vi.fn();
    render(
      <AddPairForm sessionId="sess-1" poolId="pool-1" onSuccess={onSuccess} />,
    );

    // Resolve both camper fields
    fireEvent.click(screen.getByTestId("resolve-camper-1"));
    fireEvent.click(screen.getByTestId("resolve-camper-2"));

    // Submit the form
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("does NOT call onSuccess when addPairAction returns { success: false, error: 'PAIR-04' }", async () => {
    const { addPairAction } = await import("../actions");
    vi.mocked(addPairAction).mockResolvedValueOnce({
      success: false,
      error: "PAIR-04",
    });

    const onSuccess = vi.fn();
    render(
      <AddPairForm sessionId="sess-1" poolId="pool-1" onSuccess={onSuccess} />,
    );

    // Resolve both camper fields
    fireEvent.click(screen.getByTestId("resolve-camper-1"));
    fireEvent.click(screen.getByTestId("resolve-camper-2"));

    // Submit the form
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(
        screen.queryByText(/already in an active pair/i),
      ).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
