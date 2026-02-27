import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Target, Shield, Plus, X, ExternalLink } from "lucide-react";
import { colleges } from "@/data/dataSource";
import { getCollegeSlug } from "@/lib/college-utils";
import type { SavedSchool } from "@/types/workspace";

type SchoolCategory = "reach" | "target" | "safety";

export default function MySchoolsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { activeStudent, updateStudent, students, loading: workspaceLoading } = useWorkspace();
  const router = useRouter();
  const [isAdding, setIsAdding] = useState<SchoolCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loading = authLoading || workspaceLoading;
  const savedSchools: SavedSchool[] = activeStudent?.mySchools ?? [];

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, loading, router]);

  const updateMySchools = useCallback(async (newSchools: SavedSchool[]) => {
    if (!activeStudent) return;
    try {
      await updateStudent(activeStudent.id, { mySchools: newSchools });
    } catch (err) {
      console.error("Failed to update schools:", err);
    }
  }, [activeStudent, updateStudent]);

  const addSchool = async (college: { value: string; label: string }, category: SchoolCategory) => {
    if (savedSchools.some((s) => s.value === college.value)) return;
    await updateMySchools([...savedSchools, { ...college, category }]);
    setIsAdding(null);
    setSearchQuery("");
  };

  const removeSchool = async (value: string) => {
    await updateMySchools(savedSchools.filter((s) => s.value !== value));
  };

  const moveSchool = async (value: string, newCategory: SchoolCategory) => {
    await updateMySchools(
      savedSchools.map((s) =>
        s.value === value ? { ...s, category: newCategory } : s
      )
    );
  };

  const getSchoolsByCategory = (category: SchoolCategory) => {
    return savedSchools.filter((s) => s.category === category);
  };

  const filteredColleges = colleges.filter(
    (c) =>
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !savedSchools.some((s) => s.value === c.value)
  );

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <DashboardLayout title="My Schools">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h2 className="text-xl font-semibold mb-2">No Students Yet</h2>
          <p className="text-muted-foreground mb-4">
            Add a student on the Students page to start building their college list.
          </p>
          <Button asChild>
            <Link href="/student">Go to Students</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!activeStudent) {
    return (
      <DashboardLayout title="My Schools">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">Select a student to view their schools.</p>
        </div>
      </DashboardLayout>
    );
  }

  const categories: { key: SchoolCategory; title: string; description: string; icon: React.ReactNode; color: string }[] = [
    {
      key: "reach",
      title: "Reach",
      description: "Dream schools - competitive admission based on your profile",
      icon: <Star className="size-5" />,
      color: "text-amber-500",
    },
    {
      key: "target",
      title: "Target",
      description: "Good fit - your stats match their admitted students",
      icon: <Target className="size-5" />,
      color: "text-blue-500",
    },
    {
      key: "safety",
      title: "Safety",
      description: "Likely admits - your stats exceed their averages",
      icon: <Shield className="size-5" />,
      color: "text-green-500",
    },
  ];

  return (
    <DashboardLayout title="My Schools">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {activeStudent.name}&apos;s Schools
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your college list by Reach, Target, and Safety schools.
          </p>
        </div>

        <div className="grid gap-6">
          {categories.map((cat) => {
            const schoolsInCategory = getSchoolsByCategory(cat.key);
            return (
              <Card key={cat.key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cat.color}>{cat.icon}</span>
                      <CardTitle className="text-lg">{cat.title}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        ({schoolsInCategory.length})
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAdding(isAdding === cat.key ? null : cat.key)}
                    >
                      <Plus className="size-4 mr-1" />
                      Add School
                    </Button>
                  </div>
                  <CardDescription>{cat.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isAdding === cat.key && (
                    <div className="mb-4 p-3 border rounded-lg bg-muted/50">
                      <input
                        type="text"
                        placeholder="Search colleges..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm mb-2"
                        autoFocus
                      />
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredColleges.slice(0, 10).map((college) => (
                          <button
                            key={college.value}
                            onClick={() => addSchool(college, cat.key)}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-accent text-sm"
                          >
                            {college.label}
                          </button>
                        ))}
                        {searchQuery && filteredColleges.length === 0 && (
                          <p className="text-sm text-muted-foreground px-3 py-2">
                            No colleges found
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {schoolsInCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No {cat.title.toLowerCase()} schools added yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {schoolsInCategory.map((school) => (
                        <div
                          key={school.value}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 group"
                        >
                          <Link
                            href={`/colleges/${getCollegeSlug(school.label)}`}
                            className="font-medium hover:underline flex items-center gap-1"
                          >
                            {school.label}
                            <ExternalLink className="size-3 opacity-0 group-hover:opacity-50" />
                          </Link>
                          <div className="flex items-center gap-2">
                            <select
                              value={school.category}
                              onChange={(e) =>
                                moveSchool(school.value, e.target.value as SchoolCategory)
                              }
                              className="text-xs border rounded px-2 py-1 bg-background"
                            >
                              <option value="reach">Reach</option>
                              <option value="target">Target</option>
                              <option value="safety">Safety</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeSchool(school.value)}
                              className="opacity-0 group-hover:opacity-100"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {savedSchools.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Total: {savedSchools.length} school{savedSchools.length !== 1 ? "s" : ""} in your list
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
