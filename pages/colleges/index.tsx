import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { conferences, colleges, getUsNewsRank } from "@/data/dataSource";
import { Building2, Trophy } from "lucide-react";

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

function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return null;
  return (
    <span className="ml-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
      #{rank}
    </span>
  );
}

export default function Colleges() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("conference");

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

  // Get ranked colleges sorted by rank
  const rankedColleges = colleges
    .map((c) => ({ ...c, rank: getUsNewsRank(c.label) }))
    .filter((c) => c.rank !== null)
    .sort((a, b) => (a.rank as number) - (b.rank as number));

  // Group by rank tiers
  const top25 = rankedColleges.filter((c) => c.rank! <= 25);
  const top50 = rankedColleges.filter((c) => c.rank! > 25 && c.rank! <= 50);
  const top100 = rankedColleges.filter((c) => c.rank! > 50 && c.rank! <= 100);
  const rest = rankedColleges.filter((c) => c.rank! > 100);

  return (
    <DashboardLayout title="Colleges">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Colleges</h2>
          <p className="text-muted-foreground">
            Browse colleges by conference or national ranking.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="conference">By Conference</TabsTrigger>
            <TabsTrigger value="rankings">
              <Trophy className="size-4 mr-1.5" />
              National Rankings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conference" className="mt-6">
            <Card>
              <CardHeader>
                <Building2 className="size-10 text-primary mb-2" />
                <CardTitle>College Explorer</CardTitle>
                <CardDescription>
                  Browse colleges by conference. Rankings shown where available.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        {conference.colleges.map((college) => {
                          const rank = getUsNewsRank(college.label);
                          return (
                            <Link
                              key={college.value}
                              href={getCollegeUrl(college)}
                              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                              {college.label}
                              <RankBadge rank={rank} />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rankings" className="mt-6">
            <Card>
              <CardHeader>
                <Trophy className="size-10 text-amber-500 mb-2" />
                <CardTitle>US News National Rankings 2025</CardTitle>
                <CardDescription>
                  Schools ranked by US News & World Report. Click any school for details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Top 25 */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-sm">Top 25</span>
                    </h3>
                    <div className="grid gap-2">
                      {top25.map((college) => (
                        <Link
                          key={college.value}
                          href={getCollegeUrl(college)}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 text-center font-bold text-amber-600">
                              #{college.rank}
                            </span>
                            <span className="font-medium">{college.label}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {college.conference}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Top 26-50 */}
                  {top50.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm">Ranked 26-50</span>
                      </h3>
                      <div className="grid gap-2">
                        {top50.map((college) => (
                          <Link
                            key={college.value}
                            href={getCollegeUrl(college)}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 text-center font-bold text-blue-600">
                                #{college.rank}
                              </span>
                              <span className="font-medium">{college.label}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {college.conference}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top 51-100 */}
                  {top100.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-sm">Ranked 51-100</span>
                      </h3>
                      <div className="grid gap-2">
                        {top100.map((college) => (
                          <Link
                            key={college.value}
                            href={getCollegeUrl(college)}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 text-center font-semibold text-green-600">
                                #{college.rank}
                              </span>
                              <span className="font-medium">{college.label}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {college.conference}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 100+ */}
                  {rest.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-sm">Ranked 100+</span>
                      </h3>
                      <div className="grid gap-2">
                        {rest.map((college) => (
                          <Link
                            key={college.value}
                            href={getCollegeUrl(college)}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 text-center font-semibold text-gray-500">
                                #{college.rank}
                              </span>
                              <span className="font-medium">{college.label}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {college.conference}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
