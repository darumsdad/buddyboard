"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createPoolAction } from "../actions";

export function AddPoolForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setError(null);
    try {
      await createPoolAction(new FormData(form));
      form.reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already exists")) {
        setError("A pool with that name already exists.");
      } else {
        setError("Could not add pool. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <label
        htmlFor="pool-name"
        className="text-base font-semibold text-slate-900 block mb-1"
      >
        Pool name
      </label>
      <form onSubmit={handleSubmit} className="flex gap-3 items-start">
        <input
          id="pool-name"
          name="name"
          type="text"
          required
          placeholder="Enter pool name"
          className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus size={18} />
          Add pool
        </button>
      </form>
      {error && (
        <p role="alert" className="text-base text-red-600 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
