import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

// Helper: create a valid auth session for requireAuth (no role check needed)
function makeAuthSession() {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: { id: "u1", role: "user" } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: {} as any,
  };
}

describe("requireAuth / auth guard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws Unauthorized when getSession returns null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const { searchCampersAction } = await import("./actions");
    await expect(searchCampersAction("noah", "sess-1")).rejects.toThrow("Unauthorized");
  });
});

describe("searchCampersAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("PAIR-02: returns empty array without DB call when query is empty string", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAuthSession());
    const { db } = await import("@/db");
    const { searchCampersAction } = await import("./actions");
    const result = await searchCampersAction("", "sess-1");
    expect(result).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("PAIR-01: returns exact code match when DB resolves a matching camper", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAuthSession());
    const { db } = await import("@/db");
    const mockCamper = {
      id: "c1",
      firstName: "Noah",
      lastName: "Schwartz",
      bunk: "Cabin 4",
      code: "A01",
    };
    // Mock the subquery (db.select for alreadyPaired) — called first inside searchCampersAction
    // Then mock the exact code search (second db.select chain)
    const selectChain = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      from: vi.fn() as any,
    };
    // First call: subquery for alreadyPaired — returns a Drizzle subquery object (not awaited)
    // Second call: exact code match — returns [mockCamper]
    const alreadyPairedFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ camperId: "subquery" }),
    });
    const exactFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockCamper]),
      }),
    });
    selectChain.from
      .mockReturnValueOnce({ where: vi.fn().mockReturnValue({ camperId: "subquery" }) })
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockCamper]),
        }),
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const { searchCampersAction } = await import("./actions");
    const result = await searchCampersAction("A01", "sess-1");
    expect(result).toEqual([mockCamper]);
  });
});

describe("addPairAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("PAIR-04: returns { success: false, error: 'PAIR-04' } when transaction throws error with code 23505", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAuthSession());
    const { db } = await import("@/db");
    vi.mocked(db.transaction).mockRejectedValueOnce(
      { code: "23505", message: "unique constraint" },
    );
    const { addPairAction } = await import("./actions");
    const result = await addPairAction("sess-1", "pool-1", "c1", "c2");
    expect(result).toEqual({ success: false, error: "PAIR-04" });
  });

  it("returns { success: true } and does NOT call revalidatePath when transaction resolves", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAuthSession());
    const { db } = await import("@/db");
    vi.mocked(db.transaction).mockImplementation(async (cb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return cb({ insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }) } as any);
    });
    const { revalidatePath } = await import("next/cache");
    const { addPairAction } = await import("./actions");
    const result = await addPairAction("sess-1", "pool-1", "c1", "c2");
    expect(result).toEqual({ success: true });
    expect(revalidatePath).not.toHaveBeenCalledWith("/pools/pool-1");
  });
});

describe("removePairAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("PAIR-03: calls db.delete and does NOT call revalidatePath", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAuthSession());
    const { db } = await import("@/db");
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { revalidatePath } = await import("next/cache");
    const { removePairAction } = await import("./actions");
    await removePairAction("pair-1", "pool-1");
    expect(db.delete).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalledWith("/pools/pool-1");
  });
});

describe("closeSessionAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("SESS-03: calls db.update (not db.delete) then redirect", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAuthSession());
    const { db } = await import("@/db");
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { redirect } = await import("next/navigation");
    const { closeSessionAction } = await import("./actions");
    await closeSessionAction("sess-1", "pool-1");
    expect(db.update).toHaveBeenCalled();
    expect(vi.mocked(db.delete)).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/pools");
  });
});
