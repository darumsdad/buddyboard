"use client";

import { useState } from "react";
import { setUserPasswordAction } from "../actions";

type Props = {
  userId: string;
};

export function ResetPasswordForm({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await setUserPasswordAction(userId, newPassword);
      setOpen(false);
      setError(null);
    } catch {
      setError("Could not reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="min-h-[44px] text-base text-slate-600 underline-offset-2 hover:underline"
      >
        Reset password
      </button>
      {open && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3">
          <form onSubmit={handleSubmit}>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              placeholder="New password (min. 8 characters)"
              minLength={8}
              autoComplete="new-password"
              className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            {error && (
              <p role="alert" className="text-base text-red-600 mt-1">
                {error}
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="min-h-[44px] px-4 text-base text-slate-600 hover:text-slate-900"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
