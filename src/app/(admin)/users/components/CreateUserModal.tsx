"use client";

import { useState } from "react";
import { createUserAction } from "../actions";

export function CreateUserModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createUserAction(new FormData(e.currentTarget));
      setOpen(false);
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already")) {
        setError("That username is already taken. Choose a different one.");
      } else if (msg.includes("password") || msg.includes("8")) {
        setError("Password must be at least 8 characters.");
      } else {
        setError("Could not create user. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-h-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150"
      >
        Create user
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm">
            <h2 className="text-3xl font-semibold text-slate-900 text-center mb-8">
              Create user
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="username"
                  className="text-base font-semibold text-slate-900"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="Enter a username"
                  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="text-base font-semibold text-slate-900"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Enter a password (min. 8 characters)"
                  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="role"
                  className="text-base font-semibold text-slate-900"
                >
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue="user"
                  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="user">Counselor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && (
                <p role="alert" className="text-base text-red-600">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create user
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="text-base text-slate-600 hover:text-slate-900 text-center mt-2 block mx-auto"
              >
                Close
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
