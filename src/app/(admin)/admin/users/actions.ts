"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as "user" | "admin";
  const firstName = formData.get("first-name") as string;
  const lastName = formData.get("last-name") as string;

  const result = await auth.api.createUser({
    body: {
      email: `${username.toLowerCase()}@buddyboard.local`,
      password,
      name: username,
      role,
      data: { username },
    },
    headers: await headers(),
  });

  if (!result?.user) throw new Error("Failed to create user");

  await db
    .update(userTable)
    .set({ firstName, lastName })
    .where(eq(userTable.id, result.user.id));

  revalidatePath("/admin/users");
}

export async function removeUserAction(userId: string) {
  await requireAdmin();
  await auth.api.removeUser({
    body: { userId },
    headers: await headers(),
  });
  revalidatePath("/admin/users");
}

export async function setUserPasswordAction(
  userId: string,
  newPassword: string,
) {
  await requireAdmin();

  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  await auth.api.setUserPassword({
    body: { userId, newPassword },
    headers: await headers(),
  });
}
