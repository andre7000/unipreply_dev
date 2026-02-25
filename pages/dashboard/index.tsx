import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Search, BookOpen, User } from "lucide-react";

export default function Dashboard() {
  const { currentUser, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(currentUser);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, loading, router]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const needsProfile = !profileLoading && !profile;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {needsProfile && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div className="flex items-center gap-3">
                <User className="size-5 text-primary" />
                <div>
                  <p className="font-medium">Complete your profile</p>
                  <p className="text-sm text-muted-foreground">
                    Set your account type and display name to get the most out
                    of Unipreply.
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/profile">Set up profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back{profile?.displayName ? `, ${profile.displayName}` : ""}
          </h2>
          <p className="text-muted-foreground">
            Research colleges, explore Common Data Sets, and find scholarships.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <GraduationCap className="size-10 text-primary mb-2" />
              <CardTitle>College Explorer</CardTitle>
              <CardDescription>
                Browse Common Data Sets from hundreds of colleges. Compare
                admission stats, costs, and outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild disabled>
                <Link href="#">Coming Soon</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Search className="size-10 text-primary mb-2" />
              <CardTitle>Scholarship Search</CardTitle>
              <CardDescription>
                Search scholarships by eligibility, deadline, and amount. Track
                your applications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild disabled>
                <Link href="#">Coming Soon</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BookOpen className="size-10 text-primary mb-2" />
              <CardTitle>My Research</CardTitle>
              <CardDescription>
                Save colleges and scholarships. Build your list and compare side
                by side.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild disabled>
                <Link href="#">Coming Soon</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
