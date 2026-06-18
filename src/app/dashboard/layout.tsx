import Link from "next/link";
import { Logo } from "@/components/brand";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-4">
            {user?.email && (
              <span className="hidden tnum text-xs text-subtle sm:inline">{user.email}</span>
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
