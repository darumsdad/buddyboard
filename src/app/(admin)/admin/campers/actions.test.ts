import { describe, expect, it, vi, beforeEach } from "vitest";
import * as xlsx from "xlsx";

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

// --- helpers for import tests ---

function makeAdminSession() {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: { role: "admin", id: "u1" } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: {} as any,
  };
}

/** Build a real xlsx buffer from an array of row objects */
function makeXlsxFile(rows: Record<string, string>[]): File {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, "Roster");
  const buffer: Buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  return {
    arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    size: buffer.length,
    name: "test.xlsx",
  } as unknown as File;
}

/** Build xlsx buffer using explicit aoa_to_sheet so column order matches CampMinder format */
function makeXlsxFileAoa(headers: string[], rows: string[][]): File {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
  xlsx.utils.book_append_sheet(wb, ws, "Roster");
  const buffer: Buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  return {
    arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    size: buffer.length,
    name: "test.xlsx",
  } as unknown as File;
}

describe("importCampersAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // 1. Non-admin throws Unauthorized
  it("throws Unauthorized for non-admin session", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const { importCampersAction } = await import("./actions");
    const formData = new FormData();
    await expect(importCampersAction(null, formData)).rejects.toThrow("Unauthorized");
  });

  // 2. No file returns error
  it("returns error when no file is provided", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAdminSession());
    const { importCampersAction } = await import("./actions");
    const formData = new FormData();
    formData.set("mode", "merge");
    const result = await importCampersAction(null, formData);
    expect(result).toEqual({ success: false, errors: ["No file selected."] });
  });

  // 3. Blank SwimCode returns row error (D-12)
  it("returns row error when SwimCode is blank", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAdminSession());
    const { importCampersAction } = await import("./actions");
    const file = makeXlsxFileAoa(
      ["Last Name", "Preferred Name", "SwimCode", "Bunk"],
      [["Smith", "Jane", "", "Cabin 3"]],
    );
    const formData = new FormData();
    formData.set("mode", "replace");
    formData.set("file", file);
    const result = await importCampersAction(null, formData);
    expect(result).toEqual({ success: false, errors: ["Row 2: SwimCode is blank"] });
  });

  // 4. Duplicate SwimCode returns row error (D-05)
  it("returns row error for duplicate SwimCode in sheet", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAdminSession());
    const { importCampersAction } = await import("./actions");
    const file = makeXlsxFileAoa(
      ["Last Name", "Preferred Name", "SwimCode", "Bunk"],
      [
        ["Smith", "Jane", "042", "Cabin 3"],
        ["Doe", "John", "042", "Cabin 7"],
      ],
    );
    const formData = new FormData();
    formData.set("mode", "replace");
    formData.set("file", file);
    const result = await importCampersAction(null, formData);
    expect(result).toEqual({
      success: false,
      errors: ["Row 3: duplicate SwimCode '042' (also in row 2)"],
    });
  });

  // 5. Blank Last Name returns row error (D-05)
  it("returns row error when Last Name is blank", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAdminSession());
    const { importCampersAction } = await import("./actions");
    const file = makeXlsxFileAoa(
      ["Last Name", "Preferred Name", "SwimCode", "Bunk"],
      [["", "Jane", "042", "Cabin 3"]],
    );
    const formData = new FormData();
    formData.set("mode", "replace");
    formData.set("file", file);
    const result = await importCampersAction(null, formData);
    expect(result).toEqual({ success: false, errors: ["Row 2: Last Name is blank"] });
  });

  // 6. Blank Bunk returns row error (D-08)
  it("returns row error when Bunk is blank", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAdminSession());
    const { importCampersAction } = await import("./actions");
    const file = makeXlsxFileAoa(
      ["Last Name", "Preferred Name", "SwimCode", "Bunk"],
      [["Smith", "Jane", "042", ""]],
    );
    const formData = new FormData();
    formData.set("mode", "replace");
    formData.set("file", file);
    const result = await importCampersAction(null, formData);
    expect(result).toEqual({ success: false, errors: ["Row 2: Bunk is blank"] });
  });

  // 7. Replace mode — DELETE then INSERT, returns count
  it("replace mode: calls transaction with DELETE then INSERT, returns count 2", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAdminSession());
    const { db } = await import("@/db");
    const txDelete = vi.fn().mockResolvedValue(undefined);
    const txInsertValues = vi.fn().mockResolvedValue([]);
    const txInsert = vi.fn().mockReturnValue({ values: txInsertValues });
    vi.mocked(db.transaction).mockImplementation(async (cb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return cb({ delete: vi.fn().mockReturnValue(txDelete), insert: txInsert } as any);
    });
    const { revalidatePath } = await import("next/cache");
    const { importCampersAction } = await import("./actions");
    const file = makeXlsxFileAoa(
      ["Last Name", "Preferred Name", "SwimCode", "Bunk"],
      [
        ["Smith", "Jane", "042", "Cabin 3"],
        ["Doe", "John", "101", "Cabin 7"],
      ],
    );
    const formData = new FormData();
    formData.set("mode", "replace");
    formData.set("file", file);
    const result = await importCampersAction(null, formData);
    expect(db.transaction).toHaveBeenCalled();
    expect(result).toEqual({ success: true, count: 2 });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/campers");
  });

  // 8. Merge mode — only inserts new SwimCodes, skips existing
  it("merge mode: only inserts new SwimCodes, returns count of new rows only", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAdminSession());
    const { db } = await import("@/db");
    // Existing code "042" in DB
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: vi.fn().mockResolvedValue([{ code: "042" }] as any),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const txInsertValues = vi.fn().mockResolvedValue([]);
    const txInsert = vi.fn().mockReturnValue({ values: txInsertValues });
    vi.mocked(db.transaction).mockImplementation(async (cb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return cb({ insert: txInsert } as any);
    });
    const { importCampersAction } = await import("./actions");
    const file = makeXlsxFileAoa(
      ["Last Name", "Preferred Name", "SwimCode", "Bunk"],
      [
        ["Smith", "Jane", "042", "Cabin 3"],
        ["Doe", "John", "101", "Cabin 7"],
      ],
    );
    const formData = new FormData();
    formData.set("mode", "merge");
    formData.set("file", file);
    const result = await importCampersAction(null, formData);
    expect(result).toEqual({ success: true, count: 1 });
  });

  // 9. Title case normalization (D-13)
  it("stores names in title case (D-13)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAdminSession());
    const { db } = await import("@/db");
    let capturedValues: Record<string, unknown>[] = [];
    const txInsertValues = vi.fn().mockImplementation((vals) => {
      capturedValues = vals;
      return Promise.resolve([]);
    });
    const txInsert = vi.fn().mockReturnValue({ values: txInsertValues });
    vi.mocked(db.transaction).mockImplementation(async (cb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return cb({ delete: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(undefined)), insert: txInsert } as any);
    });
    const { importCampersAction } = await import("./actions");
    const file = makeXlsxFileAoa(
      ["Last Name", "Preferred Name", "SwimCode", "Bunk"],
      [["SCHWARTZ", "NOAH", "042", "Cabin 3"]],
    );
    const formData = new FormData();
    formData.set("mode", "replace");
    formData.set("file", file);
    await importCampersAction(null, formData);
    expect(capturedValues[0]).toMatchObject({ firstName: "Noah", lastName: "Schwartz" });
  });

  // 10. Leading-zero SwimCode preserved (CAMP-02)
  it("preserves leading zeros in SwimCode (CAMP-02)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(makeAdminSession());
    const { db } = await import("@/db");
    let capturedValues: Record<string, unknown>[] = [];
    const txInsertValues = vi.fn().mockImplementation((vals) => {
      capturedValues = vals;
      return Promise.resolve([]);
    });
    const txInsert = vi.fn().mockReturnValue({ values: txInsertValues });
    vi.mocked(db.transaction).mockImplementation(async (cb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return cb({ delete: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(undefined)), insert: txInsert } as any);
    });
    const { importCampersAction } = await import("./actions");
    // Use aoa with text-formatted cell to test raw: false preserving leading zero
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([
      ["Last Name", "Preferred Name", "SwimCode", "Bunk"],
      ["Smith", "Jane", "042", "Cabin 3"],
    ]);
    // Force the SwimCode cell to be a text type so leading zero is preserved
    ws["C2"] = { v: "042", t: "s" };
    xlsx.utils.book_append_sheet(wb, ws, "Roster");
    const buffer: Buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    const file = {
      arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
      size: buffer.length,
      name: "test.xlsx",
    } as unknown as File;

    const formData = new FormData();
    formData.set("mode", "replace");
    formData.set("file", file);
    await importCampersAction(null, formData);
    expect(capturedValues[0]).toMatchObject({ code: "042" });
  });
});
