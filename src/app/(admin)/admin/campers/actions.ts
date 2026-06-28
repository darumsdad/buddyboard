"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { camper } from "@/db/schema";
import { eq } from "drizzle-orm";
import Papa from "papaparse";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function addCamperAction(formData: FormData) {
  await requireAdmin();
  const firstName = ((formData.get("first-name") as string) ?? "").trim();
  const lastName = ((formData.get("last-name") as string) ?? "").trim();
  const code = ((formData.get("code") as string) ?? "").trim();
  const bunk = ((formData.get("bunk") as string) ?? "").trim();
  const notes = ((formData.get("notes") as string) ?? "").trim();

  if (!firstName || !lastName) {
    throw new Error("First name and last name are required");
  }
  if (!code) {
    throw new Error("Code is required");
  }
  if (!bunk) {
    throw new Error("Bunk is required");
  }

  await db.insert(camper).values({
    id: crypto.randomUUID(),
    firstName,
    lastName,
    code,
    bunk,
    notes: notes || null,
  });
  revalidatePath("/admin/campers");
}

export async function editCamperAction(formData: FormData) {
  await requireAdmin();
  const id = ((formData.get("id") as string) ?? "").trim();
  if (!id) throw new Error("Camper ID is required");
  const firstName = ((formData.get("first-name") as string) ?? "").trim();
  const lastName = ((formData.get("last-name") as string) ?? "").trim();
  const code = ((formData.get("code") as string) ?? "").trim();
  const bunk = ((formData.get("bunk") as string) ?? "").trim();
  const notes = ((formData.get("notes") as string) ?? "").trim();

  if (!firstName || !lastName) {
    throw new Error("First name and last name are required");
  }
  if (!code) {
    throw new Error("Code is required");
  }
  if (!bunk) {
    throw new Error("Bunk is required");
  }

  await db
    .update(camper)
    .set({ firstName, lastName, code, bunk, notes: notes || null })
    .where(eq(camper.id, id));
  revalidatePath("/admin/campers");
}

export async function removeCamperAction(camperId: string) {
  await requireAdmin();
  await db.delete(camper).where(eq(camper.id, camperId));
  revalidatePath("/admin/campers");
}

export async function clearAllCampersAction() {
  await requireAdmin();
  await db.delete(camper);
  revalidatePath("/admin/campers");
}

// --- Excel Import ---

export type ImportResult =
  | { success: true; count: number }
  | { success: false; errors: string[] };

/** Normalize a string to title case — applied to names only, never to codes (D-13) */
function toTitleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export async function importCampersAction(
  _prev: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  await requireAdmin();

  const mode = ((formData.get("mode") as string) ?? "merge").trim();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, errors: ["No file selected."] };
  }

  let rows: Record<string, string>[];
  try {
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (result.errors.length > 0 && result.data.length === 0) {
      throw new Error("parse failed");
    }
    rows = result.data;
  } catch {
    return {
      success: false,
      errors: ["Could not parse file. Please upload a CSV file."],
    };
  }

  const errors: string[] = [];
  const seenCodes = new Map<string, number>();
  const parsed: Array<{
    firstName: string;
    lastName: string;
    code: string;
    bunk: string;
    notes: string | null;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // row 1 = header
    // Normalize header keys — trim trailing/leading whitespace (Pitfall 6)
    const norm = Object.fromEntries(
      Object.entries(rows[i]).map(([k, v]) => [k.trim(), String(v).trim()]),
    );

    // D-06: CampMinder column mapping
    const lastName = norm["Last Name"] ?? "";
    const swimCode = norm["SwimCode"] ?? "";
    const preferredName = norm["Preferred Name"] ?? "";
    const division = norm["Division"] ?? "";
    const grade = norm["Camp Grade"] ?? "";

    // Fuzzy Bunk match — any column whose name contains "bunk" (D-06)
    const bunkKey =
      Object.keys(norm).find((k) => k.toLowerCase().includes("bunk")) ?? "";
    const bunkValue = bunkKey ? (norm[bunkKey] ?? "") : "";

    // D-06: notes field from Division + Camp Grade
    const notesParts: string[] = [];
    if (division) notesParts.push("Division: " + division);
    if (grade) notesParts.push("Grade: " + grade);
    const notes = notesParts.length > 0 ? notesParts.join(" | ") : null;

    // D-13: apply title case to names only
    const firstName = preferredName ? toTitleCase(preferredName) : "";
    const lastNameNorm = lastName ? toTitleCase(lastName) : "";

    // D-05/D-12: row-level validation — collect all errors
    if (!firstName) errors.push(`Row ${rowNum}: Preferred Name is blank`);
    if (!lastNameNorm) errors.push(`Row ${rowNum}: Last Name is blank`);
    if (!swimCode) {
      errors.push(`Row ${rowNum}: SwimCode is blank`);
    } else if (seenCodes.has(swimCode)) {
      errors.push(
        `Row ${rowNum}: duplicate SwimCode '${swimCode}' (also in row ${seenCodes.get(swimCode)})`,
      );
    } else {
      seenCodes.set(swimCode, rowNum);
    }
    // D-08: bunk required (NOT NULL in DB)
    if (!bunkValue) errors.push(`Row ${rowNum}: Bunk is blank`);

    parsed.push({
      firstName,
      lastName: lastNameNorm,
      code: swimCode,
      bunk: bunkValue,
      notes,
    });
  }

  // All-or-nothing: any row error aborts before any DB write
  if (errors.length > 0) return { success: false, errors };

  if (mode === "replace") {
    // D-04: Replace — delete all, then insert all
    await db.transaction(async (tx) => {
      await tx.delete(camper);
      if (parsed.length > 0) {
        await tx.insert(camper).values(
          parsed.map((r) => ({
            id: crypto.randomUUID(),
            firstName: r.firstName,
            lastName: r.lastName,
            code: r.code,
            bunk: r.bunk,
            notes: r.notes,
          })),
        );
      }
    });
    revalidatePath("/admin/campers");
    return { success: true, count: parsed.length };
  } else {
    // D-04: Merge — insert only new SwimCodes, skip existing
    // existingCodes select is inside the transaction to eliminate TOCTOU race
    let insertedCount = 0;
    await db.transaction(async (tx) => {
      const existingRows = await tx.select({ code: camper.code }).from(camper);
      const existingCodes = new Set(existingRows.map((r) => r.code));
      const toInsert = parsed.filter((r) => !existingCodes.has(r.code));
      if (toInsert.length > 0) {
        await tx.insert(camper).values(
          toInsert.map((r) => ({
            id: crypto.randomUUID(),
            firstName: r.firstName,
            lastName: r.lastName,
            code: r.code,
            bunk: r.bunk,
            notes: r.notes,
          })),
        );
      }
      insertedCount = toInsert.length;
    });
    revalidatePath("/admin/campers");
    return { success: true, count: insertedCount };
  }
}
