"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Props = { page: number; total: number; pageSize: number };

export function PaginationControls({ page, total, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize) || 1;

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-slate-600">
        {total} camper{total !== 1 ? "s" : ""}
      </p>
      <div className="flex gap-2 items-center">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="min-h-[44px] px-3 border border-slate-300 rounded-md text-base text-slate-700 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm text-slate-600">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="min-h-[44px] px-3 border border-slate-300 rounded-md text-base text-slate-700 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
