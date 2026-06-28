"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { camper } from "@/db/schema";
import { eq } from "drizzle-orm";

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
