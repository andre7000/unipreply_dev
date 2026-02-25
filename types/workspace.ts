export type WorkspaceRole = "admin" | "student_editor";

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
}

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

export interface WorkspaceStudent {
  id: string;
  name: string;
  stats?: StudentStats;
  netPriceProfile?: NetPriceProfile;
  savedColleges?: string[];
  applicationsStarted?: number;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: WorkspaceMember[];
  students: WorkspaceStudent[];
  createdAt?: { seconds: number; nanoseconds: number };
  updatedAt?: { seconds: number; nanoseconds: number };
}
