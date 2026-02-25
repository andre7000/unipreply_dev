import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { getCollegeUrl } from "@/lib/college-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { conferences } from "@/data/dataSource";
import { Building2 } from "lucide-react";

const CONFERENCE_ORDER = [
  "Ivy League",
  "ACC",
  "Big Ten",
  "Big 12",
  "SEC",
  "Pac 12",
  "American",
  "Mountain West",
  "Conference USA",
  "Sun Belt",
  "Mid-American",
  "FBS Independents",
];

export default function Colleges() {
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

  const orderedConferences = [...conferences].sort((a, b) => {
    const idxA = CONFERENCE_ORDER.indexOf(a.name);
    const idxB = CONFERENCE_ORDER.indexOf(b.name);
    const aOrder = idxA === -1 ? 999 : idxA;
    const bOrder = idxB === -1 ? 999 : idxB;
    return aOrder - bOrder;
  });

  return (
    <DashboardLayout title="Colleges">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Colleges</h2>
          <p className="text-muted-foreground">
            Browse colleges by conference. Ivy League shown first.
          </p>
        </div>

        <Card>
          <CardHeader>
            <Building2 className="size-10 text-primary mb-2" />
            <CardTitle>College Explorer</CardTitle>
            <CardDescription>
              Browse colleges by conference. Compare admission stats, costs, and
              outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Select a college for details. More data coming soon.
            </p>

            <div className="space-y-8">
              {orderedConferences.map((conference) => (
                <div key={conference.name}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="text-primary">{conference.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      ({conference.colleges.length} schools)
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {conference.colleges.map((college) => (
                      <Link
                        key={college.value}
                        href={getCollegeUrl(college)}
                        className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {college.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
