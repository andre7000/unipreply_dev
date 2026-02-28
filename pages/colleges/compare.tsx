import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { colleges as collegeList, getUsNewsRank } from "@/data/dataSource";
import { ArrowLeft, X, Loader2, Search } from "lucide-react";

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
    label: "US News Rank",
    category: "Rankings",
    getValue: (_d, schoolLabel) => {
      const rank = schoolLabel ? getUsNewsRank(schoolLabel) : null;
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

const MAX_SCHOOLS = 4;

export default function ComparePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [schools, setSchools] = useState<SelectedSchool[]>([]);
  const [cdsDataMap, setCdsDataMap] = useState<Record<string, CDSData | null>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const handledAddParam = useRef<string | null>(null);

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
  };

  const removeSchool = (value: string) => {
    setSchools((prev) => prev.filter((s) => s.value !== value));
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
                className="w-full pl-10 pr-4 py-2 border rounded-md text-sm bg-background"
              />
              {searchFocused && filteredColleges.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
                  {filteredColleges.map((college) => (
                    <button
                      key={college.value}
                      onClick={() => addSchool(college)}
                      className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
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
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium min-w-[180px] sticky left-0 bg-muted/50">
                    Metric
                  </th>
                  {schools.map((school) => (
                    <th key={school.value} className="text-left p-3 font-medium min-w-[160px]">
                      <Link
                        href={`/colleges/${school.value}`}
                        className="hover:underline"
                      >
                        {school.label}
                      </Link>
                      {cdsDataMap[school.value]?.Common_Data_Set && (
                        <div className="text-xs text-muted-foreground font-normal mt-0.5">
                          CDS {cdsDataMap[school.value]?.Common_Data_Set}
                        </div>
                      )}
                      {!cdsDataMap[school.value] && (
                        <div className="text-xs text-amber-600 font-normal mt-0.5">
                          No CDS data
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <>
                    <tr key={`cat-${category}`} className="bg-primary/5">
                      <td
                        colSpan={schools.length + 1}
                        className="p-2 font-semibold text-primary text-xs uppercase tracking-wide"
                      >
                        {category}
                      </td>
                    </tr>
                    {metrics
                      .filter((m) => m.category === category)
                      .map((metric) => (
                          <tr key={metric.label} className="border-b hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground sticky left-0 bg-background">
                              {metric.label}
                            </td>
                            {schools.map((school) => (
                              <td key={school.value} className="p-3 font-medium">
                                {metric.getValue(cdsDataMap[school.value], school.label) ?? (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                      ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
