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

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

describe("admin pool actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // createPoolAction — non-admin rejection
  it("createPoolAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const { createPoolAction } = await import("./actions");
    const formData = new FormData();
    formData.set("name", "Pool A");

    await expect(createPoolAction(formData)).rejects.toThrow("Unauthorized");
  });

  it("createPoolAction rejects when session role is 'user'", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { role: "user" } as any, session: {} as any });

    const { createPoolAction } = await import("./actions");
    const formData = new FormData();
    formData.set("name", "Pool A");

    await expect(createPoolAction(formData)).rejects.toThrow("Unauthorized");
  });

  it("createPoolAction throws when name is empty", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { role: "admin" } as any, session: {} as any });

    const { createPoolAction } = await import("./actions");
    const formData = new FormData();
    formData.set("name", "");

    await expect(createPoolAction(formData)).rejects.toThrow("Pool name is required");
  });

  it("createPoolAction calls db.insert and revalidatePath on success", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { role: "admin" } as any, session: {} as any });

    const { db } = await import("@/db");
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { createPoolAction } = await import("./actions");
    const { revalidatePath } = await import("next/cache");
    const formData = new FormData();
    formData.set("name", "Pool A");

    await createPoolAction(formData);

    expect(db.insert).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/pools");
  });

  // renamePoolAction — non-admin rejection
  it("renamePoolAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const { renamePoolAction } = await import("./actions");
    const formData = new FormData();
    formData.set("name", "Lap Pool");

    await expect(renamePoolAction("pool-1", formData)).rejects.toThrow("Unauthorized");
  });

  it("renamePoolAction calls db.update and revalidatePath on success", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { role: "admin" } as any, session: {} as any });

    const { db } = await import("@/db");
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    vi.mocked(db.update).mockReturnValue({
      set: setMock,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { renamePoolAction } = await import("./actions");
    const { revalidatePath } = await import("next/cache");
    const formData = new FormData();
    formData.set("name", "Lap Pool");

    await renamePoolAction("pool-1", formData);

    expect(db.update).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/pools");
  });

  // removePoolAction — non-admin rejection
  it("removePoolAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const { removePoolAction } = await import("./actions");

    await expect(removePoolAction("pool-1")).rejects.toThrow("Unauthorized");
  });

  it("removePoolAction calls db.delete and revalidatePath on success", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { role: "admin" } as any, session: {} as any });

    const { db } = await import("@/db");
    const whereMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.delete).mockReturnValue({
      where: whereMock,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { removePoolAction } = await import("./actions");
    const { revalidatePath } = await import("next/cache");

    await removePoolAction("pool-1");

    expect(db.delete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/pools");
  });
});
