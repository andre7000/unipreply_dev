"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  WorkspaceStudent,
  StudentStats,
  NetPriceProfile,
} from "@/types/workspace";

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (student: Partial<Omit<WorkspaceStudent, "id">>) => Promise<void>;
  student?: WorkspaceStudent | null;
  title?: string;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  onSubmit,
  student,
  title = "Add Student",
}: StudentFormDialogProps) {
  const [name, setName] = useState(student?.name ?? "");
  const [gpa, setGpa] = useState(
    student?.stats?.gpa != null ? String(student.stats.gpa) : ""
  );
  const [sat, setSat] = useState(
    student?.stats?.sat != null ? String(student.stats.sat) : ""
  );
  const [act, setAct] = useState(
    student?.stats?.act != null ? String(student.stats.act) : ""
  );
  const [familyIncome, setFamilyIncome] = useState(
    student?.netPriceProfile?.familyIncome != null
      ? String(student.netPriceProfile.familyIncome)
      : ""
  );
  const [householdSize, setHouseholdSize] = useState(
    student?.netPriceProfile?.householdSize != null
      ? String(student.netPriceProfile.householdSize)
      : ""
  );
  const [numberInCollege, setNumberInCollege] = useState(
    student?.netPriceProfile?.numberInCollege != null
      ? String(student.netPriceProfile.numberInCollege)
      : ""
  );
  const [assets, setAssets] = useState(
    student?.netPriceProfile?.assets != null
      ? String(student.netPriceProfile.assets)
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(student?.name ?? "");
      setGpa(
        student?.stats?.gpa != null ? String(student.stats.gpa) : ""
      );
      setSat(
        student?.stats?.sat != null ? String(student.stats.sat) : ""
      );
      setAct(
        student?.stats?.act != null ? String(student.stats.act) : ""
      );
      setFamilyIncome(
        student?.netPriceProfile?.familyIncome != null
          ? String(student.netPriceProfile.familyIncome)
          : ""
      );
      setHouseholdSize(
        student?.netPriceProfile?.householdSize != null
          ? String(student.netPriceProfile.householdSize)
          : ""
      );
      setNumberInCollege(
        student?.netPriceProfile?.numberInCollege != null
          ? String(student.netPriceProfile.numberInCollege)
          : ""
      );
      setAssets(
        student?.netPriceProfile?.assets != null
          ? String(student.netPriceProfile.assets)
          : ""
      );
      setError(null);
    }
  }, [open, student]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const stats: StudentStats = {};
      const gpaNum = parseFloat(gpa);
      if (!Number.isNaN(gpaNum) && gpaNum >= 0 && gpaNum <= 4) stats.gpa = gpaNum;
      const satNum = parseInt(sat, 10);
      if (!Number.isNaN(satNum) && satNum >= 400 && satNum <= 1600) stats.sat = satNum;
      const actNum = parseInt(act, 10);
      if (!Number.isNaN(actNum) && actNum >= 1 && actNum <= 36) stats.act = actNum;

      const netPriceProfile: NetPriceProfile = {};
      const incomeNum = parseInt(familyIncome.replace(/,/g, ""), 10);
      if (!Number.isNaN(incomeNum) && incomeNum >= 0)
        netPriceProfile.familyIncome = incomeNum;
      const hhNum = parseInt(householdSize, 10);
      if (!Number.isNaN(hhNum) && hhNum >= 1) netPriceProfile.householdSize = hhNum;
      const inCollegeNum = parseInt(numberInCollege, 10);
      if (!Number.isNaN(inCollegeNum) && inCollegeNum >= 0)
        netPriceProfile.numberInCollege = inCollegeNum;
      const assetsNum = parseInt(assets.replace(/,/g, ""), 10);
      if (!Number.isNaN(assetsNum) && assetsNum >= 0)
        netPriceProfile.assets = assetsNum;

      if (student) {
        await onSubmit({
          name: name.trim(),
          stats,
          netPriceProfile,
          savedColleges: student.savedColleges,
        });
      } else {
        await onSubmit({
          name: name.trim(),
          stats,
          netPriceProfile,
          savedColleges: [],
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {student
              ? "Update student information."
              : "Add a new student profile."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Student name"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gpa">GPA</Label>
              <Input
                id="gpa"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                placeholder="0–4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sat">SAT</Label>
              <Input
                id="sat"
                type="number"
                min="400"
                max="1600"
                value={sat}
                onChange={(e) => setSat(e.target.value)}
                placeholder="400–1600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="act">ACT</Label>
              <Input
                id="act"
                type="number"
                min="1"
                max="36"
                value={act}
                onChange={(e) => setAct(e.target.value)}
                placeholder="1–36"
              />
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Net Price Calculator Profile</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Income and household info for college cost estimates.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="familyIncome">Family income (annual)</Label>
                <Input
                  id="familyIncome"
                  type="text"
                  inputMode="numeric"
                  value={familyIncome}
                  onChange={(e) =>
                    setFamilyIncome(e.target.value.replace(/[^0-9,]/g, ""))
                  }
                  placeholder="e.g. 75000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="householdSize">Household size</Label>
                <Input
                  id="householdSize"
                  type="number"
                  min="1"
                  max="20"
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(e.target.value)}
                  placeholder="e.g. 4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberInCollege">Number in college</Label>
                <Input
                  id="numberInCollege"
                  type="number"
                  min="0"
                  max="10"
                  value={numberInCollege}
                  onChange={(e) => setNumberInCollege(e.target.value)}
                  placeholder="e.g. 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assets">Assets (optional)</Label>
                <Input
                  id="assets"
                  type="text"
                  inputMode="numeric"
                  value={assets}
                  onChange={(e) =>
                    setAssets(e.target.value.replace(/[^0-9,]/g, ""))
                  }
                  placeholder="e.g. 50000"
                />
              </div>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : student ? "Save" : "Add Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
