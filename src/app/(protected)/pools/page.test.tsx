import { render, screen } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import PoolsPage from "./page";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([
          {
            id: "pool-1",
            name: "Main Pool",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "pool-2",
            name: "Lap Pool",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
    }),
  },
}));

describe("PoolsPage SESS-04", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pool names as navigation links with correct hrefs", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: "u1", role: "user" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });

    const { db } = await import("@/db");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([
          {
            id: "pool-1",
            name: "Main Pool",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "pool-2",
            name: "Lap Pool",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const jsx = await PoolsPage();
    render(jsx);

    const mainPoolLink = screen.getByRole("link", { name: "Main Pool" });
    expect(mainPoolLink).toHaveAttribute("href", "/pools/pool-1");

    const lapPoolLink = screen.getByRole("link", { name: "Lap Pool" });
    expect(lapPoolLink).toHaveAttribute("href", "/pools/pool-2");
  });

  it("renders empty state when no pools configured", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: "u1", role: "user" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });

    const { db } = await import("@/db");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([]),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const jsx = await PoolsPage();
    render(jsx);

    expect(
      screen.getByText("No pools configured — contact your administrator."),
    ).toBeInTheDocument();
  });
});
