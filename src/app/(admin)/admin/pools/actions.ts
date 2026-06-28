"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pool } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createPoolAction(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string ?? "").trim();
  if (!name) throw new Error("Pool name is required");
  const existing = await db.select({ id: pool.id }).from(pool).where(ilike(pool.name, name)).limit(1);
  if (existing.length > 0) throw new Error("A pool with that name already exists.");
  await db.insert(pool).values({ id: crypto.randomUUID(), name });
  revalidatePath("/admin/pools");
}

export async function renamePoolAction(poolId: string, formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string ?? "").trim();
  if (!name) throw new Error("Pool name is required");
  await db.update(pool).set({ name }).where(eq(pool.id, poolId));
  revalidatePath("/admin/pools");
}

export async function removePoolAction(poolId: string) {
  await requireAdmin();
  await db.delete(pool).where(eq(pool.id, poolId));
  revalidatePath("/admin/pools");
}
