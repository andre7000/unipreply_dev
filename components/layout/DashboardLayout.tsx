import { ReactNode, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  LayoutDashboard,
  User,
  LogOut,
  UserCircle,
  Settings,
  Building2,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AIChatDrawer } from "@/components/chat/AIChatDrawer";
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
  const [chatOpen, setChatOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const CHAT_MIN = 100;
  const CHAT_MAX = 800;

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: MouseEvent) => {
      setChatWidth((w) => {
        const delta = e.movementX;
        const next = w - delta;
        return Math.min(CHAT_MAX, Math.max(CHAT_MIN, next));
      });
    };

    const handleUp = () => setIsResizing(false);

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

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
                  href="/scholarships"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <Award className="size-4" />
                  Scholarships
                </Link>
              </div>
              <div className="flex-1" />
              <div className="space-y-1 pt-4 border-t">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <User className="size-4" />
                  Profile
                </Link>
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
            <div className="flex h-14 items-center pl-6 pr-1 justify-between gap-4">
              <h1 className="font-semibold shrink-0">{title}</h1>
              <StudentSelector />
              <div className="flex-1 min-w-0" />
              <AIChatDrawer
                open={chatOpen}
                onOpenChange={setChatOpen}
                triggerOnly
              />
            </div>
          </header>

          <div className="p-6 max-w-5xl mx-auto">{children}</div>
        </main>

        {chatOpen && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-valuenow={chatWidth}
              onMouseDown={handleResizeStart}
              className={`shrink-0 w-1.5 cursor-col-resize bg-border hover:bg-primary/30 transition-colors flex-shrink-0 ${
                isResizing ? "bg-primary/50" : ""
              }`}
            />
            <aside
              className="shrink-0 min-h-0 border-l flex flex-col bg-background"
              style={{ width: chatWidth }}
            >
              <AIChatDrawer open={chatOpen} onOpenChange={setChatOpen} />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
