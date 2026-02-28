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
import { GraduationCap, Search, MessageCircle } from "lucide-react";

export default function Dashboard() {
  const { currentUser, loading } = useAuth();
  const { profile } = useUserProfile(currentUser);
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
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
              <Button asChild>
                <Link href="/colleges">Explore Colleges</Link>
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
              <Button asChild>
                <Link href="/scholarships">Find Scholarships</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MessageCircle className="size-10 text-primary mb-2" />
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>
                Chat with our AI to get personalized college recommendations and
                research help.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/chat">Start Chat</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
