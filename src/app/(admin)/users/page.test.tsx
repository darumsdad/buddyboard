import { render, screen } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import UsersPage from "./page";

vi.mock("./components/CreateUserModal", () => ({
  CreateUserModal: () => <button>Create user</button>,
}));

vi.mock("./components/UserTable", () => ({
  UserTable: ({ users }: { users: unknown[] }) => (
    <table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Role</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.length === 0 && (
          <tr>
            <td>No users yet</td>
          </tr>
        )}
      </tbody>
    </table>
  ),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({ user: { role: "admin" } }),
      listUsers: vi.fn().mockResolvedValue({ users: [] }),
    },
  },
}));

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders h1 with text 'User Management'", async () => {
    const jsx = await UsersPage();
    render(jsx);
    expect(
      screen.getByRole("heading", { name: /User Management/i }),
    ).toBeInTheDocument();
  });

  it("renders a button with text 'Create user'", async () => {
    const jsx = await UsersPage();
    render(jsx);
    expect(
      screen.getByRole("button", { name: /Create user/i }),
    ).toBeInTheDocument();
  });

  it("renders th 'Username'", async () => {
    const jsx = await UsersPage();
    render(jsx);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("renders th 'Role'", async () => {
    const jsx = await UsersPage();
    render(jsx);
    expect(screen.getByText("Role")).toBeInTheDocument();
  });

  it("renders th 'Created'", async () => {
    const jsx = await UsersPage();
    render(jsx);
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("renders th 'Actions'", async () => {
    const jsx = await UsersPage();
    render(jsx);
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders empty state text when users list is empty", async () => {
    const jsx = await UsersPage();
    render(jsx);
    expect(screen.getByText("No users yet")).toBeInTheDocument();
  });
});
