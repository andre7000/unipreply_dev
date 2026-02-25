export type UserType = "parent" | "student";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string;
  userType: UserType;
  createdAt?: { seconds: number; nanoseconds: number };
  updatedAt?: { seconds: number; nanoseconds: number };
}
