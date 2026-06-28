"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (timer.current) clearTimeout(timer.current);
      const q = e.target.value;
      timer.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (q) params.set("q", q); else params.delete("q");
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
      }, 300);
    },
    [router, pathname, searchParams],
  );

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder="Search by name or code..."
      className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
    />
  );
}
