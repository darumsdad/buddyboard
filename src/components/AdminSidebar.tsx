"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

const links = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/campers", label: "Campers" },
  { href: "/admin/pools", label: "Pools" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav className="w-48 shrink-0 bg-slate-50 border-r border-slate-200 min-h-screen p-4 flex flex-col">
      <ul className="flex flex-col gap-1 flex-1">
        {links.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={
                  active
                    ? "block px-3 py-2 rounded-md text-base font-semibold bg-blue-600 text-white transition-colors"
                    : "block px-3 py-2 rounded-md text-base font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                }
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-slate-200 pt-3 mt-3">
        <Link
          href="/pools"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
        >
          <ExternalLink size={14} />
          View Buddy Board
        </Link>
      </div>
    </nav>
  );
}
