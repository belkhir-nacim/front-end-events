"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Assess", match: (p: string) => p === "/dashboard" },
  { href: "/dashboard/library", label: "Library", match: (p: string) => p.startsWith("/dashboard/library") },
  { href: "/dashboard/explore", label: "Explore", match: (p: string) => p.startsWith("/dashboard/explore") },
];

export function DashboardNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {ITEMS.map((it) => {
        const active = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-ink text-paper" : "text-subtle hover:text-ink"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
