import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCollegeBySlug } from "@/lib/college-utils";
import { CDSDisplay } from "@/components/colleges/CDSDisplay";
import { GitCompare, DollarSign } from "lucide-react";

export default function CollegeDetail() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { slug } = router.query;

  const college =
    typeof slug === "string" ? getCollegeBySlug(slug) : undefined;

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (!loading && slug && !college) {
      router.replace("/colleges");
    }
  }, [college, loading, router, slug]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!college) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">College not found.</p>
      </div>
    );
  }

  return (
    <DashboardLayout title={college.label}>
      <div className="space-y-8">
        {/* Header with high-level info */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {college.label}
            </h1>
            <p className="text-muted-foreground mt-1">
              {college.conference} • Research university
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              More detailed info (location, size, type) coming soon. Data will be
              populated from Common Data Set.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/colleges">
              <GitCompare className="size-4" />
              Compare Schools
            </Link>
          </Button>
        </div>

        {/* Common Data Set section */}
        <CDSDisplay collegeName={college.label} />

        {/* Scholarships section */}
        <Card>
          <CardHeader>
            <DollarSign className="size-10 text-primary mb-2" />
            <CardTitle>Scholarships</CardTitle>
            <CardDescription>
              Scholarships and financial aid specific to {college.label}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Scholarship listings will be populated here. You can add
              institution-specific scholarships, deadlines, amounts, and
              eligibility criteria.
            </p>
            <div className="mt-4 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">
                Placeholder structure
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Merit-based scholarships</li>
                <li>Need-based aid</li>
                <li>Departmental awards</li>
                <li>External scholarships (college-specific)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
