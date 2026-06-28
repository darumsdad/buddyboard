export function displayRole(role: string | null | undefined): string {
  if (role === "admin") return "Admin";
  return "Counselor"; // covers "user", null, undefined, and anything else
}
