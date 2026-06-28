"use client";

import { useState } from "react";
import { Key } from "lucide-react";
import { setUserPasswordAction } from "../actions";

type Props = {
  userId: string;
};

export function ResetPasswordForm({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
      setError(null);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 1500);
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
        aria-label="Reset password"
        title="Reset password"
        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <Key size={18} />
      </button>
      {open && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3">
          {success ? (
            <p role="status" className="text-base text-green-600 py-2">
              Password updated successfully.
            </p>
          ) : (
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              placeholder="Min. 8 characters"
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
          )}
        </div>
      )}
    </div>
  );
}
