import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Briefcase, LayoutDashboard, Bell, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "One dashboard, every application",
    description: "See what's due, what's stale, and what needs a follow-up at a glance.",
  },
  {
    icon: Bell,
    title: "Never miss a follow-up",
    description: "Referral and application follow-ups get suggested automatically.",
  },
  {
    icon: BarChart3,
    title: "Know what's actually working",
    description: "Track conversion from application to interview to offer, by source.",
  },
];

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Briefcase className="size-4" />
          </div>
          <span className="text-sm font-semibold">TrackHire</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-20 pt-16 text-center sm:pt-24">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
          Your job search, actually organized
        </h1>
        <p className="mt-4 max-w-xl text-balance text-muted-foreground sm:text-lg">
          Track applications, referrals, interviews, and follow-ups in one fast, focused workspace —
          built to feel like a real product, not a spreadsheet.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">Get started free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in">I already have an account</Link>
          </Button>
        </div>
        <Link href="/demo" className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Or explore a live demo with sample data →
        </Link>

        <div className="mt-20 grid w-full max-w-4xl gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <f.icon className="mb-3 size-5 text-primary" />
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
