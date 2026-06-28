"use client";

import { useState } from "react";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const { data, error: signInError } = await authClient.signIn.username({
        username: formData.get("username") as string,
        password: formData.get("password") as string,
      });

      if (signInError || !data?.user) {
        setError("Invalid username or password");
      } else {
        router.push(data.user.role === "admin" ? "/admin/users" : "/pools");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-2">
          <Image
            src="/camp-regesh-logo.png"
            alt="Camp Regesh"
            width={300}
            height={150}
            className="object-contain"
            priority
            unoptimized
          />
        </div>
        <p className="text-center text-sm font-semibold text-slate-500 tracking-widest uppercase mb-6">
          BuddyBoard
        </p>
        <div className="bg-slate-50 rounded-lg p-8 shadow-sm">
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
              autoComplete="username"
              placeholder="Enter your username"
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
              autoComplete="current-password"
              placeholder="Enter your password"
              className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
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
            Log in
          </button>
          </form>
        </div>
      </div>
    </div>
  );
}
