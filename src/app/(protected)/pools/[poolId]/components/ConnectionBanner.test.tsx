import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConnectionBanner } from "./ConnectionBanner";

// Wave 0 stub replaced — component ConnectionBanner.tsx created in Plan 05-04.

describe("BOARD-04", () => {
  it("renders nothing when status is connected", () => {
    const { container } = render(
      <ConnectionBanner status="connected" onRefresh={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows Reconnecting message for reconnecting status", () => {
    render(<ConnectionBanner status="reconnecting" onRefresh={vi.fn()} />);
    expect(screen.getByText("Reconnecting…")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /refresh/i }),
    ).toBeNull();
  });

  it("shows Disconnected message and Refresh button for disconnected status", () => {
    const onRefresh = vi.fn();
    render(<ConnectionBanner status="disconnected" onRefresh={onRefresh} />);
    expect(
      screen.getByText("Disconnected — data may be stale."),
    ).toBeDefined();
    const btn = screen.getByRole("button", { name: "Refresh pair list" });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
