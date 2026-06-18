import { redirect as navRedirect } from "next/navigation";
import { Logo } from "@/components/brand";
import { ClimateDial, type DialDatum } from "@/components/climate-dial";
import { LoginForm } from "@/components/auth/login-form";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

const DIAL: DialDatum[] = [
  { month: 1, heat: 7, rain: 11 }, { month: 2, heat: 8, rain: 9 },
  { month: 3, heat: 12, rain: 10 }, { month: 4, heat: 16, rain: 9 },
  { month: 5, heat: 20, rain: 10 }, { month: 6, heat: 23, rain: 8 },
  { month: 7, heat: 26, rain: 7 }, { month: 8, heat: 26, rain: 7 },
  { month: 9, heat: 22, rain: 7 }, { month: 10, heat: 16, rain: 9 },
  { month: 11, heat: 11, rain: 10 }, { month: 12, heat: 8, rain: 11 },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const dest = redirect && redirect.startsWith("/") ? redirect : "/dashboard";

  const user = await getUser();
  if (user) navRedirect(dest);

  return (
    <div className="grid flex-1 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex">
        <Logo />
        <div className="flex items-center justify-center">
          <ClimateDial data={DIAL} selected={8} size={300} centerTop="typical year" centerMain="Aug" />
        </div>
        <div>
          <p className="font-display text-2xl font-semibold leading-snug text-ink">
            The weather odds for your date — before you commit.
          </p>
          <p className="mt-2 tnum text-xs text-subtle">
            ERA5 reanalysis · 1940–present
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          <p className="eyebrow mt-8 text-brand-ink lg:mt-0">Welcome back</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">Sign in to Serenia</h1>
          <p className="mt-2 text-sm text-subtle">
            Save venues, run comparisons, and ask the assistant about any date.
          </p>
          <div className="mt-8">
            <LoginForm redirect={dest} />
          </div>
        </div>
      </div>
    </div>
  );
}
