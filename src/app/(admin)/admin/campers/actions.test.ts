import { describe, expect, it, vi, beforeEach } from "vitest";

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

describe("camper actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // --- addCamperAction ---

  it("addCamperAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const { addCamperAction } = await import("./actions");
    const formData = new FormData();
    await expect(addCamperAction(formData)).rejects.toThrow("Unauthorized");
  });

  it("addCamperAction rejects when code is blank", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { role: "admin", id: "u1" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });
    const { addCamperAction } = await import("./actions");
    const formData = new FormData();
    formData.set("first-name", "Noah");
    formData.set("last-name", "Schwartz");
    formData.set("code", "");
    formData.set("bunk", "Cabin 3");
    await expect(addCamperAction(formData)).rejects.toThrow(
      "Code is required",
    );
  });

  it("addCamperAction rejects when bunk is blank (D-08)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { role: "admin", id: "u1" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });
    const { addCamperAction } = await import("./actions");
    const formData = new FormData();
    formData.set("first-name", "Noah");
    formData.set("last-name", "Schwartz");
    formData.set("code", "042");
    formData.set("bunk", "");
    await expect(addCamperAction(formData)).rejects.toThrow(
      "Bunk is required",
    );
  });

  it("addCamperAction calls db.insert and revalidatePath on success", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { role: "admin", id: "u1" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });
    const { db } = await import("@/db");
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { revalidatePath } = await import("next/cache");
    const { addCamperAction } = await import("./actions");
    const formData = new FormData();
    formData.set("first-name", "Noah");
    formData.set("last-name", "Schwartz");
    formData.set("code", "042");
    formData.set("bunk", "Cabin 3");
    await addCamperAction(formData);
    expect(db.insert).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/campers");
  });

  // --- editCamperAction ---

  it("editCamperAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const { editCamperAction } = await import("./actions");
    const formData = new FormData();
    await expect(editCamperAction(formData)).rejects.toThrow("Unauthorized");
  });

  it("editCamperAction calls db.update and revalidatePath on success", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { role: "admin", id: "u1" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });
    const { db } = await import("@/db");
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { revalidatePath } = await import("next/cache");
    const { editCamperAction } = await import("./actions");
    const formData = new FormData();
    formData.set("id", "c1");
    formData.set("first-name", "Noah");
    formData.set("last-name", "Schwartz");
    formData.set("code", "042");
    formData.set("bunk", "Cabin 3");
    await editCamperAction(formData);
    expect(db.update).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/campers");
  });

  // --- removeCamperAction ---

  it("removeCamperAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const { removeCamperAction } = await import("./actions");
    await expect(removeCamperAction("c1")).rejects.toThrow("Unauthorized");
  });

  it("removeCamperAction calls db.delete and revalidatePath on success", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { role: "admin", id: "u1" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });
    const { db } = await import("@/db");
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { revalidatePath } = await import("next/cache");
    const { removeCamperAction } = await import("./actions");
    await removeCamperAction("c1");
    expect(db.delete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/campers");
  });

  // --- clearAllCampersAction ---

  it("clearAllCampersAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const { clearAllCampersAction } = await import("./actions");
    await expect(clearAllCampersAction()).rejects.toThrow("Unauthorized");
  });

  it("clearAllCampersAction calls db.delete (no where) and revalidatePath on success", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { role: "admin", id: "u1" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });
    const { db } = await import("@/db");
    // clearAllCampersAction calls db.delete(camper) — no .where, resolves directly
    vi.mocked(db.delete).mockResolvedValue(undefined as never);
    const { revalidatePath } = await import("next/cache");
    const { clearAllCampersAction } = await import("./actions");
    await clearAllCampersAction();
    expect(db.delete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/campers");
  });
});
