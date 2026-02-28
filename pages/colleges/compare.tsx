import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { colleges as collegeList, getUsNewsRank, getQsWorldRank, getCollegeMetadata } from "@/data/dataSource";
import { ArrowLeft, X, Loader2, Search, Plus, Trash2, ChevronUp, ChevronDown, Check } from "lucide-react";

interface CDSData {
  id: string;
  Common_Data_Set?: string;
  Institution?: string;
  A_General_Information?: any;
  B_Enrollment_and_Persistence?: any;
  C_First_Time_First_Year_Admission?: any;
  G_Annual_Expenses?: any;
  H_Financial_Aid?: any;
  I_Instructional_Faculty_and_Class_Size?: any;
}

interface SelectedSchool {
  value: string;
  label: string;
}

interface CompareMetric {
  label: string;
  category: string;
  getValue: (data: CDSData | null, schoolLabel?: string) => string | number | null;
}

const metrics: CompareMetric[] = [
  {
    label: "Type",
    category: "Overview",
    getValue: (d, schoolLabel) => {
      const meta = schoolLabel ? getCollegeMetadata(schoolLabel) : null;
      if (meta) return meta.type === "public" ? "Public" : "Private";
      const control = d?.A_General_Information?.A2_Source_of_institutional_control;
      return control || null;
    },
  },
  {
    label: "Location",
    category: "Overview",
    getValue: (d, schoolLabel) => {
      const meta = schoolLabel ? getCollegeMetadata(schoolLabel) : null;
      if (meta) return `${meta.city}, ${meta.state}`;
      const loc = d?.A_General_Information?.A1_Address_Information?.City_State_Zip_Country;
      return loc || null;
    },
  },
  {
    label: "US News Rank",
    category: "Rankings",
    getValue: (_d, schoolLabel) => {
      const rank = schoolLabel ? getUsNewsRank(schoolLabel) : null;
      return rank ? `#${rank}` : null;
    },
  },
  {
    label: "QS World Rank",
    category: "Rankings",
    getValue: (_d, schoolLabel) => {
      const rank = schoolLabel ? getQsWorldRank(schoolLabel) : null;
      return rank ? `#${rank}` : null;
    },
  },
  {
    label: "Acceptance Rate",
    category: "Admissions",
    getValue: (d) => {
      const applied = d?.C_First_Time_First_Year_Admission?.C1_Applications?.Total_applied;
      const admitted = d?.C_First_Time_First_Year_Admission?.C1_Applications?.Total_admitted;
      return applied && admitted ? `${((admitted / applied) * 100).toFixed(1)}%` : null;
    },
  },
  {
    label: "Total Applications",
    category: "Admissions",
    getValue: (d) => d?.C_First_Time_First_Year_Admission?.C1_Applications?.Total_applied?.toLocaleString() ?? null,
  },
  {
    label: "SAT Range (25th-75th)",
    category: "Admissions",
    getValue: (d) => {
      const scores = d?.C_First_Time_First_Year_Admission?.C9_First_Time_First_Year_Profile?.SAT_Scores_25th_50th_75th_Percentiles?.Composite;
      return scores?.length >= 2 ? `${scores[0]}-${scores[2] || scores[1]}` : null;
    },
  },
  {
    label: "ACT Range (25th-75th)",
    category: "Admissions",
    getValue: (d) => {
      const scores = d?.C_First_Time_First_Year_Admission?.C9_First_Time_First_Year_Profile?.ACT_Scores_25th_50th_75th_Percentiles?.Composite;
      return scores?.length >= 2 ? `${scores[0]}-${scores[2] || scores[1]}` : null;
    },
  },
  {
    label: "% Submitting SAT",
    category: "Admissions",
    getValue: (d) => d?.C_First_Time_First_Year_Admission?.C9_First_Time_First_Year_Profile?.Percent_Submitting_SAT ?? null,
  },
  {
    label: "Early Decision Deadline",
    category: "Deadlines",
    getValue: (d) => d?.C_First_Time_First_Year_Admission?.C21_Early_Decision?.Closing_date ?? null,
  },
  {
    label: "Regular Decision Deadline",
    category: "Deadlines",
    getValue: (d) => d?.C_First_Time_First_Year_Admission?.C13_C18_Admission_Policies?.Application_closing_date ?? null,
  },
  {
    label: "Tuition",
    category: "Costs",
    getValue: (d) =>
      d?.G_Annual_Expenses?.G1_Undergraduate_Full_Time_Costs_2025_2026?.Tuition?.Private_Institutions ||
      d?.G_Annual_Expenses?.G1_Undergraduate_Full_Time_Costs_2025_2026?.Tuition?.In_State ||
      null,
  },
  {
    label: "Room & Board",
    category: "Costs",
    getValue: (d) => d?.G_Annual_Expenses?.G1_Undergraduate_Full_Time_Costs_2025_2026?.Food_and_Housing_on_campus ?? null,
  },
  {
    label: "Avg Financial Aid Package",
    category: "Financial Aid",
    getValue: (d) => d?.H_Financial_Aid?.H2_Enrolled_Students_Awarded_Aid?.First_Time_Full_Time_Freshmen?.Average_financial_aid_package ?? null,
  },
  {
    label: "Avg Need-Based Grant",
    category: "Financial Aid",
    getValue: (d) => d?.H_Financial_Aid?.H2_Enrolled_Students_Awarded_Aid?.First_Time_Full_Time_Freshmen?.Average_need_based_scholarship_grant ?? null,
  },
  {
    label: "Student-Faculty Ratio",
    category: "Academics",
    getValue: (d) => d?.I_Instructional_Faculty_and_Class_Size?.I2_Student_to_Faculty_Ratio ?? null,
  },
  {
    label: "Total Undergraduates",
    category: "Academics",
    getValue: (d) => d?.B_Enrollment_and_Persistence?.B1_Institutional_Enrollment_By_Gender?.Total_all_Undergraduate?.toLocaleString() ?? null,
  },
  {
    label: "Retention Rate",
    category: "Academics",
    getValue: (d) => d?.B_Enrollment_and_Persistence?.B22_Retention_Rate ?? null,
  },
  {
    label: "6-Year Graduation Rate",
    category: "Academics",
    getValue: (d) => d?.B_Enrollment_and_Persistence?.B4_B12_Graduation_Rates?.Fall_2018_Cohort_Six_Year_Graduation_Rate ?? null,
  },
];

const MAX_SCHOOLS = 10;

interface CustomRow {
  id: string;
  label: string;
  values: Record<string, string>; // schoolValue -> user input
}

export default function ComparePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [schools, setSchools] = useState<SelectedSchool[]>([]);
  const [cdsDataMap, setCdsDataMap] = useState<Record<string, CDSData | null>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const handledAddParam = useRef<string | null>(null);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [newRowLabel, setNewRowLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Handle URL param to add school (only once per param value)
  useEffect(() => {
    const { add } = router.query;
    if (add && typeof add === "string" && handledAddParam.current !== add) {
      handledAddParam.current = add;
      const college = collegeList.find((c) => c.value === add);
      if (college) {
        setSchools((prev) => {
          if (prev.some((s) => s.value === add)) return prev;
          return [...prev, { value: college.value, label: college.label }];
        });
      }
      router.replace("/colleges/compare", undefined, { shallow: true });
    }
  }, [router.query.add, router]);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, authLoading, router]);

  // Load saved comparison on mount
  useEffect(() => {
    async function loadSavedComparison() {
      if (!currentUser || initialLoadDone) return;
      try {
        const docRef = doc(db, "userComparisons", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.schools?.length > 0) {
            setSchools(data.schools);
          }
          if (data.customRows?.length > 0) {
            setCustomRows(data.customRows);
          }
        }
      } catch (error) {
        console.error("Error loading saved comparison:", error);
      }
      setInitialLoadDone(true);
    }
    loadSavedComparison();
  }, [currentUser, initialLoadDone]);

  // Auto-save comparison
  const saveComparison = useCallback(async () => {
    if (!currentUser || !initialLoadDone) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "userComparisons", currentUser.uid), {
        schools,
        customRows,
        updatedAt: new Date(),
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving comparison:", error);
    }
    setSaving(false);
  }, [currentUser, schools, customRows, initialLoadDone]);

  // Debounced auto-save when schools or customRows change
  useEffect(() => {
    if (!initialLoadDone) return;
    const timeout = setTimeout(() => {
      saveComparison();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [schools, customRows, saveComparison, initialLoadDone]);

  // Load CDS data when schools change
  useEffect(() => {
    async function loadCDSData() {
      if (schools.length === 0) {
        setCdsDataMap({});
        return;
      }

      setLoading(true);
      const collegeRef = collection(db, "collegeDatasets");
      const snapshot = await getDocs(collegeRef);

      const newMap: Record<string, CDSData | null> = {};

      for (const school of schools) {
        const normalizedName = school.label.toLowerCase().trim();
        let found = false;

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const institution = (
            data.Institution ||
            data.A_General_Information?.A1_Address_Information?.Name_of_College_University ||
            ""
          ).toLowerCase();

          if (
            institution.includes(normalizedName) ||
            normalizedName.includes(institution.split(" ")[0])
          ) {
            newMap[school.value] = { id: doc.id, ...data } as CDSData;
            found = true;
            break;
          }
        }

        if (!found) {
          newMap[school.value] = null;
        }
      }

      setCdsDataMap(newMap);
      setLoading(false);
    }

    loadCDSData();
  }, [schools]);

  const addSchool = (college: { value: string; label: string }) => {
    if (schools.length >= MAX_SCHOOLS) return;
    if (schools.some((s) => s.value === college.value)) return;
    setSchools((prev) => [...prev, college]);
    setSearchQuery("");
    setHighlightedIndex(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredColleges.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => 
        prev < filteredColleges.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredColleges[highlightedIndex]) {
        addSchool(filteredColleges[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setSearchFocused(false);
      setSearchQuery("");
    }
  };

  const removeSchool = (value: string) => {
    setSchools((prev) => prev.filter((s) => s.value !== value));
  };

  const moveSchoolUp = (index: number) => {
    if (index <= 0) return;
    setSchools((prev) => {
      const newSchools = [...prev];
      [newSchools[index - 1], newSchools[index]] = [newSchools[index], newSchools[index - 1]];
      return newSchools;
    });
  };

  const moveSchoolDown = (index: number) => {
    if (index >= schools.length - 1) return;
    setSchools((prev) => {
      const newSchools = [...prev];
      [newSchools[index], newSchools[index + 1]] = [newSchools[index + 1], newSchools[index]];
      return newSchools;
    });
  };

  const filteredColleges = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return collegeList
      .filter(
        (c) =>
          c.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !schools.some((s) => s.value === c.value)
      )
      .slice(0, 8);
  }, [searchQuery, schools]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const addCustomRow = () => {
    if (!newRowLabel.trim()) return;
    const newRow: CustomRow = {
      id: `custom-${Date.now()}`,
      label: newRowLabel.trim(),
      values: {},
    };
    setCustomRows((prev) => [...prev, newRow]);
    setNewRowLabel("");
  };

  const removeCustomRow = (id: string) => {
    setCustomRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateCustomRowValue = (rowId: string, schoolValue: string, value: string) => {
    setCustomRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, values: { ...row.values, [schoolValue]: value } }
          : row
      )
    );
  };

  const categories = [...new Set(metrics.map((m) => m.category))];

  if (authLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <DashboardLayout title="Compare Schools">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/colleges">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Compare Schools</h1>
          {saving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Saving...
            </span>
          )}
          {!saving && lastSaved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="size-3" />
              Saved
            </span>
          )}
        </div>

        {/* School Selection */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {schools.map((school) => (
              <div
                key={school.value}
                className="flex items-center gap-2 bg-background border rounded-full px-3 py-1.5 text-sm"
              >
                <span>{school.label}</span>
                <button
                  onClick={() => removeSchool(school.value)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {schools.length === 0 && (
              <p className="text-sm text-muted-foreground">No schools selected</p>
            )}
          </div>

          {schools.length < MAX_SCHOOLS && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search to add a school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-4 py-2 border rounded-md text-sm bg-background"
              />
              {searchFocused && filteredColleges.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
                  {filteredColleges.map((college, index) => (
                    <button
                      key={college.value}
                      onClick={() => addSchool(college)}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        index === highlightedIndex
                          ? "bg-muted"
                          : "hover:bg-muted"
                      }`}
                    >
                      {college.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {schools.length}/{MAX_SCHOOLS} schools selected
          </p>
        </div>

        {/* Comparison Table */}
        {schools.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Search and add schools above to compare them
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading data...</span>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-3 font-medium min-w-[200px] sticky left-0 bg-muted/50 z-10">
                    School
                  </th>
                  {metrics.map((metric) => (
                    <th key={metric.label} className="text-center py-2 px-2 font-medium whitespace-nowrap">
                      <div className="text-xs text-muted-foreground font-normal">{metric.category}</div>
                      <div>{metric.label}</div>
                    </th>
                  ))}
                  {customRows.map((row) => (
                    <th key={row.id} className="text-center py-2 px-2 font-medium whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-purple-700">{row.label}</span>
                        <button
                          onClick={() => removeCustomRow(row.id)}
                          className="text-red-500 hover:text-red-700 opacity-50 hover:opacity-100"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schools.map((school, index) => (
                  <tr key={school.value} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-2 sticky left-0 bg-background z-10">
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveSchoolUp(index)}
                            disabled={index === 0}
                            className="p-0.5 hover:bg-muted rounded disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp className="size-3" />
                          </button>
                          <button
                            onClick={() => moveSchoolDown(index)}
                            disabled={index === schools.length - 1}
                            className="p-0.5 hover:bg-muted rounded disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown className="size-3" />
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/colleges/${school.value}`}
                            className="font-medium hover:underline"
                          >
                            {school.label}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {cdsDataMap[school.value]?.Common_Data_Set ? (
                              <span>CDS {cdsDataMap[school.value]?.Common_Data_Set}</span>
                            ) : (
                              <span className="text-amber-600">No CDS data</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeSchool(school.value)}
                          className="p-1 text-muted-foreground hover:text-red-500"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </td>
                    {metrics.map((metric) => (
                      <td key={metric.label} className="py-1.5 px-2 text-center whitespace-nowrap">
                        {metric.getValue(cdsDataMap[school.value], school.label) ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                    {customRows.map((row) => (
                      <td key={row.id} className="py-1 px-2">
                        <input
                          type="text"
                          value={row.values[school.value] || ""}
                          onChange={(e) =>
                            updateCustomRowValue(row.id, school.value, e.target.value)
                          }
                          placeholder="..."
                          className="w-full min-w-[80px] px-2 py-0.5 text-sm text-center border rounded bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Add Custom Columns */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Add column:</span>
            {["Political Geography", "Campus Vibe", "Weather", "Greek Life", "Sports Culture", "Research Focus", "My Fit Score"].map((label) => (
              <button
                key={label}
                onClick={() => {
                  if (!customRows.some((r) => r.label === label)) {
                    setCustomRows((prev) => [
                      ...prev,
                      { id: `custom-${Date.now()}-${label}`, label, values: {} },
                    ]);
                  }
                }}
                disabled={customRows.some((r) => r.label === label)}
                className="px-2 py-1 border rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                + {label}
              </button>
            ))}
            <div className="flex items-center gap-1 ml-2">
              <input
                type="text"
                value={newRowLabel}
                onChange={(e) => setNewRowLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomRow()}
                placeholder="Custom column..."
                className="px-2 py-1 text-sm border rounded bg-background focus:ring-1 focus:ring-primary focus:outline-none w-32"
              />
              <button
                onClick={addCustomRow}
                disabled={!newRowLabel.trim()}
                className="p-1 text-primary hover:bg-primary/10 rounded disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
