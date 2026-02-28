import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCollegeBySlug } from "@/lib/college-utils";
import { getUsNewsRank, getQsWorldRank } from "@/data/dataSource";
import { CDSDisplay } from "@/components/colleges/CDSDisplay";
import { ScholarshipDisplay } from "@/components/colleges/ScholarshipDisplay";
import { GitCompare, Trophy } from "lucide-react";

export default function CollegeDetail() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { slug } = router.query;

  const college =
    typeof slug === "string" ? getCollegeBySlug(slug) : undefined;
  
  const usNewsRank = college ? getUsNewsRank(college.label) : null;
  const qsWorldRank = college ? getQsWorldRank(college.label) : null;

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
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {college.label}
              </h1>
              {usNewsRank && (
                <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-sm font-semibold">
                  <Trophy className="size-3.5" />
                  #{usNewsRank} US News
                </div>
              )}
              {qsWorldRank && (
                <div className="flex items-center gap-1.5 bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-sm font-semibold">
                  #{qsWorldRank} QS World
                </div>
              )}
            </div>
            <p className="text-muted-foreground">
              {college.conference} • Research university
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/colleges/compare?add=${college.value}`}>
              <GitCompare className="size-4" />
              Compare Schools
            </Link>
          </Button>
        </div>

        {/* Common Data Set section */}
        <CDSDisplay collegeName={college.label} />

        {/* Scholarships section */}
        <Card>
          <CardContent className="pt-6">
            <ScholarshipDisplay collegeId={college.value} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
