import { describe, it, vi, beforeEach, expect } from "vitest";
import { NextRequest } from "next/server";

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

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Route Handler V4 access control
describe("Route Handler V4 access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when auth.api.getSession returns null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const { GET } = await import("./route");

    const request = new NextRequest("http://localhost/api/sessions/s1/pairs");
    const response = await GET(request, {
      params: Promise.resolve({ sessionId: "s1" }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("returns pairs JSON when authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: "u1", role: "user" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });

    const { db } = await import("@/db");
    // Two rows for the same pairId — verifies grouping logic
    const mockRows = [
      {
        pairId: "pair-1",
        camperId: "camper-1",
        firstName: "Alice",
        lastName: "Smith",
        bunk: "A1",
        code: "AS",
      },
      {
        pairId: "pair-1",
        camperId: "camper-2",
        firstName: "Bob",
        lastName: "Jones",
        bunk: "B2",
        code: "BJ",
      },
    ];

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockRows),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { GET } = await import("./route");

    const request = new NextRequest("http://localhost/api/sessions/s1/pairs");
    const response = await GET(request, {
      params: Promise.resolve({ sessionId: "s1" }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({
      pairs: [
        {
          id: "pair-1",
          members: [
            { camperId: "camper-1", firstName: "Alice", lastName: "Smith", bunk: "A1", code: "AS" },
            { camperId: "camper-2", firstName: "Bob", lastName: "Jones", bunk: "B2", code: "BJ" },
          ],
        },
      ],
    });
  });
});
