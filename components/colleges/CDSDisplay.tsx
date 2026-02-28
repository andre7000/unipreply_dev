import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GraduationCap,
  DollarSign,
  Users,
  TrendingUp,
  Building2,
  Loader2,
  BookOpen,
  Wallet,
} from "lucide-react";

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

interface CDSDisplayProps {
  collegeName: string;
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
}: {
  label: string;
  value: string | number | null | undefined;
  subtext?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">
            {value ?? "N/A"}
          </p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
          )}
        </div>
        {Icon && <Icon className="size-5 text-muted-foreground" />}
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "N/A"}</span>
    </div>
  );
}

export function CDSDisplay({ collegeName }: CDSDisplayProps) {
  const [cdsData, setCdsData] = useState<CDSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCDS() {
      try {
        const normalizedName = collegeName.toLowerCase().trim();
        const collegeRef = collection(db, "collegeDatasets");
        const snapshot = await getDocs(collegeRef);

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
            setCdsData({ id: doc.id, ...data } as CDSData);
            setLoading(false);
            return;
          }
        }

        setCdsData(null);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching CDS:", err);
        setError("Failed to load CDS data");
        setLoading(false);
      }
    }

    if (collegeName) {
      fetchCDS();
    }
  }, [collegeName]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading CDS data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!cdsData) {
    return (
      <Card>
        <CardHeader>
          <Building2 className="size-8 text-muted-foreground mb-2" />
          <CardTitle>Common Data Set</CardTitle>
          <CardDescription>
            No CDS data available for this college yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            CDS data can be uploaded via the admin panel. Once available, you'll see
            admission stats, costs, financial aid, and more.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Extract key data
  const admissions = cdsData.C_First_Time_First_Year_Admission;
  const enrollment = cdsData.B_Enrollment_and_Persistence;
  const costs = cdsData.G_Annual_Expenses;
  const aid = cdsData.H_Financial_Aid;
  const faculty = cdsData.I_Instructional_Faculty_and_Class_Size;

  // Calculate acceptance rate
  const applied = admissions?.C1_Applications?.Total_applied;
  const admitted = admissions?.C1_Applications?.Total_admitted;
  const acceptanceRate =
    applied && admitted
      ? `${((admitted / applied) * 100).toFixed(1)}%`
      : null;

  // SAT scores
  const satScores = admissions?.C9_First_Time_First_Year_Profile?.SAT_Scores_25th_50th_75th_Percentiles?.Composite;
  const satRange = satScores?.length >= 2 ? `${satScores[0]}-${satScores[2] || satScores[1]}` : null;

  // ACT scores
  const actScores = admissions?.C9_First_Time_First_Year_Profile?.ACT_Scores_25th_50th_75th_Percentiles?.Composite;
  const actRange = actScores?.length >= 2 ? `${actScores[0]}-${actScores[2] || actScores[1]}` : null;

  // Costs
  const tuition =
    costs?.G1_Undergraduate_Full_Time_Costs_2025_2026?.Tuition?.Private_Institutions ||
    costs?.G1_Undergraduate_Full_Time_Costs_2025_2026?.Tuition?.In_State;
  const roomBoard = costs?.G1_Undergraduate_Full_Time_Costs_2025_2026?.Food_and_Housing_on_campus;

  // Financial aid
  const avgAidPackage =
    aid?.H2_Enrolled_Students_Awarded_Aid?.First_Time_Full_Time_Freshmen?.Average_financial_aid_package;

  // Enrollment
  const totalUndergrad = enrollment?.B1_Institutional_Enrollment_By_Gender?.Total_all_Undergraduate;
  const retentionRate = enrollment?.B22_Retention_Rate;

  // Faculty
  const studentFacultyRatio = faculty?.I2_Student_to_Faculty_Ratio;

  // Deadlines
  const edDeadline = admissions?.C21_Early_Decision?.Closing_date;
  const rdDeadline = admissions?.C13_C18_Admission_Policies?.Application_closing_date;

  return (
    <div className="space-y-6">
      {/* CDS Year Badge */}
      {cdsData.Common_Data_Set && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
            CDS {cdsData.Common_Data_Set}
          </span>
        </div>
      )}

      {/* Key Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Acceptance Rate"
          value={acceptanceRate}
          icon={TrendingUp}
        />
        <StatCard
          label="SAT Range"
          value={satRange}
          subtext="25th-75th %ile"
          icon={GraduationCap}
        />
        <StatCard
          label="Tuition"
          value={tuition}
          icon={DollarSign}
        />
        <StatCard
          label="Enrollment"
          value={totalUndergrad?.toLocaleString()}
          subtext="Undergraduates"
          icon={Users}
        />
      </div>

      {/* All Sections - Scrollable */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Admissions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" />
              <CardTitle className="text-lg">Admissions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <DataRow label="Total Applications" value={applied?.toLocaleString()} />
            <DataRow label="Total Admitted" value={admitted?.toLocaleString()} />
            <DataRow label="Acceptance Rate" value={acceptanceRate} />
            <DataRow label="Total Enrolled" value={admissions?.C1_Applications?.Total_enrolled?.toLocaleString()} />
            <div className="pt-3 pb-1">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Test Scores (25th-75th)</p>
            </div>
            <DataRow label="SAT Composite" value={satRange} />
            <DataRow label="ACT Composite" value={actRange} />
            <DataRow label="% Submitting SAT" value={admissions?.C9_First_Time_First_Year_Profile?.Percent_Submitting_SAT} />
            <DataRow label="% Submitting ACT" value={admissions?.C9_First_Time_First_Year_Profile?.Percent_Submitting_ACT} />
          </CardContent>
        </Card>

        {/* Deadlines */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              <CardTitle className="text-lg">Deadlines & Policies</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <DataRow label="Early Decision" value={edDeadline} />
            <DataRow label="Regular Decision" value={rdDeadline} />
            <DataRow label="Early Action" value={admissions?.C22_Early_Action?.Offered ? "Offered" : "Not Offered"} />
            <DataRow label="Application Fee" value={admissions?.C13_C18_Admission_Policies?.Application_Fee?.Amount} />
            <DataRow label="Fee Waiver Available" value={admissions?.C13_C18_Admission_Policies?.Application_Fee?.Can_be_waived ? "Yes" : "No"} />
            <DataRow label="Notification Date" value={admissions?.C13_C18_Admission_Policies?.Notification_date} />
            <DataRow label="Waitlist Used" value={admissions?.C2_Waitlist_Policy?.Has_waitlist ? "Yes" : "No"} />
          </CardContent>
        </Card>

        {/* Costs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="size-5 text-primary" />
              <CardTitle className="text-lg">Annual Costs</CardTitle>
            </div>
            <CardDescription className="text-xs">2025-2026 Academic Year</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <DataRow label="Tuition" value={tuition} />
            <DataRow
              label="Required Fees"
              value={costs?.G1_Undergraduate_Full_Time_Costs_2025_2026?.Required_Fees?.First_Year}
            />
            <DataRow label="Room & Board" value={roomBoard} />
            <DataRow
              label="Housing Only"
              value={costs?.G1_Undergraduate_Full_Time_Costs_2025_2026?.Housing_Only}
            />
            <DataRow
              label="Food Only"
              value={costs?.G1_Undergraduate_Full_Time_Costs_2025_2026?.Food_Only}
            />
            <DataRow
              label="Books & Supplies"
              value={costs?.G5_Estimated_Expenses?.Books_and_supplies}
            />
          </CardContent>
        </Card>

        {/* Financial Aid */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-primary" />
              <CardTitle className="text-lg">Financial Aid</CardTitle>
            </div>
            <CardDescription className="text-xs">First-time, full-time freshmen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <DataRow label="Avg Aid Package" value={avgAidPackage} />
            <DataRow
              label="Avg Need-Based Grant"
              value={aid?.H2_Enrolled_Students_Awarded_Aid?.First_Time_Full_Time_Freshmen?.Average_need_based_scholarship_grant}
            />
            <DataRow
              label="Students with Need"
              value={aid?.H2_Enrolled_Students_Awarded_Aid?.First_Time_Full_Time_Freshmen?.Determined_to_have_need?.toLocaleString()}
            />
            <DataRow
              label="Received Need-Based Aid"
              value={aid?.H2_Enrolled_Students_Awarded_Aid?.First_Time_Full_Time_Freshmen?.Awarded_any_need_based_aid?.toLocaleString()}
            />
            <div className="pt-3 pb-1">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Student Borrowing</p>
            </div>
            <DataRow
              label="% Using Any Loan"
              value={aid?.H5_Student_Borrowing_Class_of_2024?.Any_loan_program?.Percent}
            />
            <DataRow
              label="Avg Loan Amount"
              value={aid?.H5_Student_Borrowing_Class_of_2024?.Any_loan_program?.Average_Amount}
            />
          </CardContent>
        </Card>

        {/* Academics */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              <CardTitle className="text-lg">Academics</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <DataRow label="Student-Faculty Ratio" value={studentFacultyRatio} />
            <DataRow label="Retention Rate" value={retentionRate} />
            <DataRow
              label="6-Year Graduation Rate"
              value={enrollment?.B4_B12_Graduation_Rates?.Fall_2018_Cohort_Six_Year_Graduation_Rate}
            />
            <div className="pt-3 pb-1">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Class Sizes</p>
            </div>
            <DataRow label="2-9 students" value={faculty?.I3_Undergraduate_Class_Size?.["2-9"]} />
            <DataRow label="10-19 students" value={faculty?.I3_Undergraduate_Class_Size?.["10-19"]} />
            <DataRow label="20-29 students" value={faculty?.I3_Undergraduate_Class_Size?.["20-29"]} />
            <DataRow
              label="50+ students"
              value={
                (faculty?.I3_Undergraduate_Class_Size?.["50-99"] || 0) +
                (faculty?.I3_Undergraduate_Class_Size?.["100+"] || 0) || "N/A"
              }
            />
          </CardContent>
        </Card>

        {/* Enrollment */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <CardTitle className="text-lg">Enrollment</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <DataRow label="Total Undergraduates" value={totalUndergrad?.toLocaleString()} />
            <DataRow
              label="Total Graduate Students"
              value={enrollment?.B1_Institutional_Enrollment_By_Gender?.Total_all_Graduate_and_Professional?.toLocaleString()}
            />
            <DataRow
              label="Grand Total"
              value={enrollment?.B1_Institutional_Enrollment_By_Gender?.Grand_Total_All_Students?.toLocaleString()}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
