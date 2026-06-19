import Link from "next/link";
import { Logo } from "@/components/brand";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CommandPalette } from "@/components/recall/command-palette";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <Logo href="/dashboard" />
            <DashboardNav />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <CommandPalette />
            {user?.email && (
              <span className="hidden tnum text-xs text-subtle md:inline">{user.email}</span>
            )}
            {user ? (
              <SignOutButton />
            ) : (
              <Link href="/login" className="text-sm text-subtle hover:text-ink transition-colors">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
