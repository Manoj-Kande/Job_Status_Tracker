import { UserProfile } from "@clerk/nextjs";
import { Topbar } from "@/components/layout/topbar";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" />
      <main className="flex-1 space-y-6 p-4 pb-20 md:p-6 md:pb-6">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium">Appearance</p>
            <p className="text-xs text-muted-foreground">Switch between light and dark mode.</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm [&_.cl-rootBox]:w-full [&_.cl-cardBox]:w-full [&_.cl-cardBox]:shadow-none [&_.cl-card]:w-full">
          <UserProfile routing="hash" />
        </div>
      </main>
    </>
  );
}
