import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Award } from "lucide-react";

export default function Scholarships() {
  const { currentUser, loading } = useAuth();
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
    <DashboardLayout title="Scholarships">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Scholarships</h2>
          <p className="text-muted-foreground">
            Search scholarships by eligibility, deadline, and amount. Track your
            applications.
          </p>
        </div>

        <Card>
          <CardHeader>
            <Award className="size-10 text-primary mb-2" />
            <CardTitle>Scholarship Search</CardTitle>
            <CardDescription>
              Search scholarships by eligibility, deadline, and amount. Track
              your applications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Scholarship search coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
