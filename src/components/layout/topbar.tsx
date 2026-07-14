"use client";
import { Bell, Menu } from "lucide-react";
import { UserButton, Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { QuickAddDrawer } from "@/components/jobs/quick-add-drawer";
import { GlobalSearch } from "@/components/layout/global-search";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import Link from "next/link";
import { navItems } from "./nav-items";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-4">
          <SheetTitle className="mb-2">TrackHire</SheetTitle>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-accent"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <h1 className="text-sm font-semibold md:text-base">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />

        <QuickAddDrawer />

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell />
        </Button>

        <ThemeToggle />

        <Show when="signed-in" fallback={
          <Button size="sm" variant="outline" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        }>
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
