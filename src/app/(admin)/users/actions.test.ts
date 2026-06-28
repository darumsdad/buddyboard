import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      createUser: vi.fn(),
      removeUser: vi.fn(),
      setUserPassword: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("admin user actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createUserAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const { createUserAction } = await import("./actions");
    const formData = new FormData();
    formData.set("username", "testuser");
    formData.set("password", "password123");
    formData.set("role", "user");

    await expect(createUserAction(formData)).rejects.toThrow("Unauthorized");
  });

  it("createUserAction rejects when session role is 'user'", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { role: "user" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });

    const { createUserAction } = await import("./actions");
    const formData = new FormData();
    formData.set("username", "testuser");
    formData.set("password", "password123");
    formData.set("role", "user");

    await expect(createUserAction(formData)).rejects.toThrow("Unauthorized");
  });

  it("removeUserAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const { removeUserAction } = await import("./actions");

    await expect(removeUserAction("user-id-123")).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("setUserPasswordAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const { setUserPasswordAction } = await import("./actions");

    await expect(
      setUserPasswordAction("user-id-123", "newpassword123"),
    ).rejects.toThrow("Unauthorized");
  });

  it("createUserAction calls auth.api.createUser when session has role 'admin'", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { role: "admin" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });
    vi.mocked(auth.api.createUser).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: "1" } as any,
    });

    const { createUserAction } = await import("./actions");
    const formData = new FormData();
    formData.set("username", "testuser");
    formData.set("password", "password123");
    formData.set("role", "user");

    await createUserAction(formData);

    expect(auth.api.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          email: "testuser@buddyboard.local",
          password: "password123",
          name: "testuser",
          role: "user",
          data: { username: "testuser" },
        }),
      }),
    );
  });

  it("createUserAction calls revalidatePath('/admin/users') on success", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { role: "admin" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session: {} as any,
    });
    vi.mocked(auth.api.createUser).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: "1" } as any,
    });

    const { createUserAction } = await import("./actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("username", "testuser");
    formData.set("password", "password123");
    formData.set("role", "user");

    await createUserAction(formData);

    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });
});
