import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import LoginPage from "./page";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      username: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a heading with text BuddyBoard", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: /BuddyBoard/i }),
    ).toBeInTheDocument();
  });

  it("renders an input with name='username'", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("textbox", { name: /username/i }),
    ).toBeInTheDocument();
  });

  it("renders an input with name='password' and type='password'", () => {
    render(<LoginPage />);
    const passwordInput = document.querySelector('input[name="password"]');
    expect(passwordInput).toBeTruthy();
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("renders a submit button with text 'Log in'", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("button", { name: /log in/i }),
    ).toBeInTheDocument();
  });

  it("does NOT show an error message on initial render", () => {
    render(<LoginPage />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows 'Invalid username or password' alert when login fails", async () => {
    const { authClient } = await import("@/lib/auth-client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(authClient.signIn.username).mockResolvedValueOnce({
      error: { message: "bad credentials" },
    } as any);

    render(<LoginPage />);

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("Invalid username or password");
    });
  });
});
