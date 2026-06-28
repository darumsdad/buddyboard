import { render, screen } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import CampersPage from "./page";

vi.mock("./components/CamperTable", () => ({
  CamperTable: ({ campers }: { campers: unknown[] }) => (
    <div>{campers.length === 0 ? "No campers yet" : "Has campers"}</div>
  ),
}));

vi.mock("./components/AddCamperModal", () => ({
  AddCamperModal: () => <button>Add camper</button>,
}));

vi.mock("./components/ClearAllCampersDialog", () => ({
  ClearAllCampersDialog: () => <button>Clear all campers</button>,
}));

vi.mock("./components/SearchBar", () => ({
  SearchBar: ({ defaultValue }: { defaultValue?: string }) => (
    <input type="search" defaultValue={defaultValue} placeholder="Search by name or code..." />
  ),
}));

vi.mock("./components/PaginationControls", () => ({
  PaginationControls: ({ total }: { total: number }) => (
    <div>Pagination: {total} total</div>
  ),
}));

vi.mock("./components/ImportModal", () => ({
  ImportModal: () => <button>Import roster</button>,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({ user: { role: "admin" } }),
    },
  },
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          // Camper list query chain: .where().orderBy().limit().offset()
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
          // Count query resolves directly from .where()
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve([{ count: 0 }]).then(resolve),
          catch: () => Promise.resolve([{ count: 0 }]),
        }),
      }),
    }),
  },
}));

describe("CampersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders h1 with text 'Campers'", async () => {
    const jsx = await CampersPage({
      searchParams: Promise.resolve({}),
    });
    render(jsx);
    expect(
      screen.getByRole("heading", { name: /Campers/i }),
    ).toBeInTheDocument();
  });

  it("renders empty state text when no campers", async () => {
    const jsx = await CampersPage({
      searchParams: Promise.resolve({}),
    });
    render(jsx);
    expect(screen.getByText("No campers yet")).toBeInTheDocument();
  });
});
