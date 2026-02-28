export interface StudentStats {
  gpa?: number | null;
  sat?: number | null;
  act?: number | null;
}

export interface NetPriceProfile {
  familyIncome?: number | null;
  householdSize?: number | null;
  numberInCollege?: number | null;
  assets?: number | null;
}

export interface SavedSchool {
  value: string;
  label: string;
  category: "aspirational" | "target" | "safety";
  rank?: number;
}

export interface WorkspaceStudent {
  id: string;
  name: string;
  stats?: StudentStats;
  netPriceProfile?: NetPriceProfile;
  mySchools?: SavedSchool[];
  createdAt?: { seconds: number; nanoseconds: number };
  updatedAt?: { seconds: number; nanoseconds: number };
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: { seconds: number; nanoseconds: number };
  updatedAt?: { seconds: number; nanoseconds: number };
}
