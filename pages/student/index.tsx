import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Plus, Pencil, Trash2 } from "lucide-react";
import { StudentFormDialog } from "@/components/students/StudentFormDialog";
import type {
  WorkspaceStudent,
  StudentStats,
  NetPriceProfile,
} from "@/types/workspace";

export default function Student() {
  const { currentUser, loading } = useAuth();
  const {
    students,
    activeStudent,
    addStudent,
    updateStudent,
    removeStudent,
  } = useWorkspace();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<WorkspaceStudent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addGpa, setAddGpa] = useState("");
  const [addSat, setAddSat] = useState("");
  const [addAct, setAddAct] = useState("");
  const [addFamilyIncome, setAddFamilyIncome] = useState("");
  const [addHouseholdSize, setAddHouseholdSize] = useState("");
  const [addNumberInCollege, setAddNumberInCollege] = useState("");
  const [addAssets, setAddAssets] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, loading, router]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      setAddError("Name is required");
      return;
    }
    setAddSaving(true);
    setAddError(null);
    try {
      const stats: StudentStats = {};
      const gpaNum = parseFloat(addGpa);
      if (!Number.isNaN(gpaNum) && gpaNum >= 0 && gpaNum <= 4) stats.gpa = gpaNum;
      const satNum = parseInt(addSat, 10);
      if (!Number.isNaN(satNum) && satNum >= 400 && satNum <= 1600)
        stats.sat = satNum;
      const actNum = parseInt(addAct, 10);
      if (!Number.isNaN(actNum) && actNum >= 1 && actNum <= 36)
        stats.act = actNum;
      const netPriceProfile: NetPriceProfile = {};
      const incomeNum = parseInt(addFamilyIncome.replace(/,/g, ""), 10);
      if (!Number.isNaN(incomeNum) && incomeNum >= 0)
        netPriceProfile.familyIncome = incomeNum;
      const hhNum = parseInt(addHouseholdSize, 10);
      if (!Number.isNaN(hhNum) && hhNum >= 1)
        netPriceProfile.householdSize = hhNum;
      const inCollegeNum = parseInt(addNumberInCollege, 10);
      if (!Number.isNaN(inCollegeNum) && inCollegeNum >= 0)
        netPriceProfile.numberInCollege = inCollegeNum;
      const assetsNum = parseInt(addAssets.replace(/,/g, ""), 10);
      if (!Number.isNaN(assetsNum) && assetsNum >= 0)
        netPriceProfile.assets = assetsNum;
      await addStudent({
        name: addName.trim(),
        stats,
        netPriceProfile,
        mySchools: [],
      });
      setAddOpen(false);
      setAddName("");
      setAddGpa("");
      setAddSat("");
      setAddAct("");
      setAddFamilyIncome("");
      setAddHouseholdSize("");
      setAddNumberInCollege("");
      setAddAssets("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setAddSaving(false);
    }
  };

  const handleRemoveStudent = async (student: WorkspaceStudent) => {
    if (!confirm(`Remove ${student.name}? This cannot be undone.`)) return;
    try {
      await removeStudent(student.id);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <DashboardLayout title="Students">
        <div className="space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Student Command Center
              </h2>
              <p className="text-muted-foreground">
                View and manage student profiles. Use the selector above to
                switch between students.
              </p>
            </div>
            <Button
              variant={addOpen ? "secondary" : "default"}
              onClick={() => {
                setAddOpen(!addOpen);
                setAddError(null);
              }}
            >
              <Plus className="size-4" />
              {addOpen ? "Cancel" : "Add Student"}
            </Button>
          </div>

          {addOpen && (
            <Card>
              <CardHeader>
                <CardTitle>Add Student</CardTitle>
                <CardDescription>
                  Add a new student profile to your workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Name</Label>
                    <Input
                      id="add-name"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="Student name"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="add-gpa">GPA</Label>
                      <Input
                        id="add-gpa"
                        type="number"
                        step="0.01"
                        min="0"
                        max="4"
                        value={addGpa}
                        onChange={(e) => setAddGpa(e.target.value)}
                        placeholder="0–4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-sat">SAT</Label>
                      <Input
                        id="add-sat"
                        type="number"
                        min="400"
                        max="1600"
                        value={addSat}
                        onChange={(e) => setAddSat(e.target.value)}
                        placeholder="400–1600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-act">ACT</Label>
                      <Input
                        id="add-act"
                        type="number"
                        min="1"
                        max="36"
                        value={addAct}
                        onChange={(e) => setAddAct(e.target.value)}
                        placeholder="1–36"
                      />
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">
                      Net Price Calculator Profile
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Income and household info for college cost estimates.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-familyIncome">
                          Family income (annual)
                        </Label>
                        <Input
                          id="add-familyIncome"
                          type="text"
                          inputMode="numeric"
                          value={addFamilyIncome}
                          onChange={(e) =>
                            setAddFamilyIncome(
                              e.target.value.replace(/[^0-9,]/g, "")
                            )
                          }
                          placeholder="e.g. 75000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-householdSize">
                          Household size
                        </Label>
                        <Input
                          id="add-householdSize"
                          type="number"
                          min="1"
                          max="20"
                          value={addHouseholdSize}
                          onChange={(e) =>
                            setAddHouseholdSize(e.target.value)
                          }
                          placeholder="e.g. 4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-numberInCollege">
                          Number in college
                        </Label>
                        <Input
                          id="add-numberInCollege"
                          type="number"
                          min="0"
                          max="10"
                          value={addNumberInCollege}
                          onChange={(e) =>
                            setAddNumberInCollege(e.target.value)
                          }
                          placeholder="e.g. 1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-assets">Assets (optional)</Label>
                        <Input
                          id="add-assets"
                          type="text"
                          inputMode="numeric"
                          value={addAssets}
                          onChange={(e) =>
                            setAddAssets(
                              e.target.value.replace(/[^0-9,]/g, "")
                            )
                          }
                          placeholder="e.g. 50000"
                        />
                      </div>
                    </div>
                  </div>
                  {addError && (
                    <p className="text-sm text-destructive">{addError}</p>
                  )}
                  <Button type="submit" disabled={addSaving}>
                    {addSaving ? "Adding..." : "Add Student"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {students.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No students yet</CardTitle>
                  <CardDescription>
                    Add your first student profile to get started.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setAddOpen(true)}
                    variant="outline"
                  >
                    <Plus className="size-4" />
                    Add Student
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
              {students.map((student) => (
                <Card key={student.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <GraduationCap className="size-10 text-primary mb-2" />
                        <CardTitle>{student.name}</CardTitle>
                        <CardDescription>
                          GPA: {student.stats?.gpa ?? "—"} • SAT:{" "}
                          {student.stats?.sat ?? "—"} • ACT:{" "}
                          {student.stats?.act ?? "—"}
                          {student.netPriceProfile?.familyIncome != null && (
                            <>
                              {" "}
                              • Income: $
                              {student.netPriceProfile.familyIncome.toLocaleString()}
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${student.name}`}
                          onClick={() => {
                            setEditStudent(student);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${student.name}`}
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveStudent(student)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(student.netPriceProfile?.familyIncome != null ||
                      student.netPriceProfile?.householdSize != null) && (
                      <div className="text-xs text-muted-foreground mb-3 pb-3 border-b">
                        Net Price Profile:{" "}
                        {student.netPriceProfile.familyIncome != null &&
                          `$${student.netPriceProfile.familyIncome.toLocaleString()} income`}
                        {student.netPriceProfile.householdSize != null &&
                          ` • ${student.netPriceProfile.householdSize} in household`}
                        {student.netPriceProfile.numberInCollege != null &&
                          ` • ${student.netPriceProfile.numberInCollege} in college`}
                        {student.netPriceProfile.assets != null &&
                          ` • $${student.netPriceProfile.assets.toLocaleString()} assets`}
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          My Schools
                        </span>
                        <span>{student.mySchools?.length ?? 0}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              ((student.mySchools?.length ?? 0) / 15) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card
                className="border-dashed cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors flex flex-col items-center justify-center min-h-[200px]"
                onClick={() => setAddOpen(true)}
              >
                <CardContent className="flex flex-col items-center justify-center flex-1 pt-6">
                  <Plus className="size-12 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Add Student
                  </span>
                </CardContent>
              </Card>
              </>
            )}
          </div>
        </div>

        <StudentFormDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditStudent(null);
          }}
          student={editStudent ?? undefined}
          title="Edit Student"
          onSubmit={async (data) => {
            if (!editStudent) return;
            await updateStudent(editStudent.id, data);
          }}
        />
      </DashboardLayout>
    );
}
