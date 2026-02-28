import { ReactNode, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  LayoutDashboard,
  LogOut,
  UserCircle,
  Settings,
  Building2,
  Award,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ListChecks,
  GitCompareArrows,
} from "lucide-react";
import { StudentSelector } from "@/components/StudentSelector";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({
  children,
  title = "Dashboard",
}: DashboardLayoutProps) {
  const router = useRouter();
  const { currentUser, signOut } = useAuth();
  const [navOpen, setNavOpen] = useState(true);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [signOut, router]);

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={`${
          navOpen ? "w-64" : "w-14"
        } shrink-0 border-r flex flex-col transition-[width] duration-200 ease-in-out overflow-hidden`}
      >
        <div className="p-4 border-b flex items-center justify-between gap-2 min-h-[57px]">
          {navOpen ? (
            <>
              <Link
                href="/"
                className="flex items-center gap-1 font-semibold text-lg shrink-0"
              >
                <GraduationCap className="size-6 text-primary" />
                Unipreply
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-md border border-input shrink-0"
                aria-label="Collapse sidebar"
                onClick={() => setNavOpen(false)}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center w-full gap-2">
              <Link
                href="/"
                className="flex items-center justify-center"
                aria-label="Unipreply home"
              >
                <GraduationCap className="size-6 text-primary" />
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-md border border-input"
                aria-label="Expand sidebar"
                onClick={() => setNavOpen(true)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
        {navOpen && (
          <>
            <nav className="flex-1 p-4 space-y-1 flex flex-col">
              <div className="space-y-1">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
                <Link
                  href="/student"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <GraduationCap className="size-4" />
                  Student
                </Link>
                <Link
                  href="/colleges"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <Building2 className="size-4" />
                  Colleges
                </Link>
                <Link
                  href="/colleges/compare"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <GitCompareArrows className="size-4" />
                  Compare
                </Link>
                <Link
                  href="/my-schools"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <ListChecks className="size-4" />
                  My Schools
                </Link>
                <Link
                  href="/scholarships"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <Award className="size-4" />
                  Scholarships
                </Link>
                <Link
                  href="/chat"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <MessageCircle className="size-4" />
                  Chat
                </Link>
              </div>
              <div className="flex-1" />
              <div className="space-y-1 pt-4 border-t">
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <UserCircle className="size-4" />
                  Account
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <Settings className="size-4" />
                  Settings
                </Link>
              </div>
            </nav>
            <div className="p-4 border-t">
              <div className="text-sm text-muted-foreground truncate px-2 mb-2">
                {currentUser?.email}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Sign Out
              </Button>
            </div>
          </>
        )}
      </aside>

      <div className="flex flex-1 min-w-0">
        <main className="flex-1 overflow-auto min-w-0">
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-6 justify-between gap-4">
              <h1 className="font-semibold shrink-0">{title}</h1>
              <StudentSelector />
            </div>
          </header>

          <div className="p-6 max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
