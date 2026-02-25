import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import type { Workspace, WorkspaceStudent } from "@/types/workspace";
import type { UserType } from "@/types/profile";

export async function createDefaultWorkspace(
  ownerId: string,
  userType: UserType,
  displayName?: string
): Promise<string> {
  const studentId = crypto.randomUUID?.() ?? `student_${Date.now()}`;
  const students: WorkspaceStudent[] =
    userType === "student"
      ? [
          {
            id: studentId,
            name: displayName ?? "My Profile",
            stats: {},
            savedColleges: [],
          },
        ]
      : [];

  const workspaceData = {
    name: userType === "parent" ? "Family" : displayName ?? "My Workspace",
    ownerId,
    members: [{ userId: ownerId, role: "admin" as const }],
    students,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "workspaces"), workspaceData);
  return docRef.id;
}

export async function getWorkspacesForUser(
  userId: string
): Promise<(Workspace & { id: string })[]> {
  const q = query(
    collection(db, "workspaces"),
    where("ownerId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as (Workspace & { id: string })[];
}

export async function ensureWorkspaceForUser(
  userId: string,
  userType: string,
  displayName?: string
): Promise<(Workspace & { id: string })[] | null> {
  const list = await getWorkspacesForUser(userId);
  if (list.length > 0) return list;

  await createDefaultWorkspace(
    userId,
    userType as import("@/types/profile").UserType,
    displayName
  );
  return getWorkspacesForUser(userId);
}

export async function addStudent(
  workspaceId: string,
  student: Omit<WorkspaceStudent, "id">
): Promise<WorkspaceStudent> {
  const studentId = crypto.randomUUID?.() ?? `student_${Date.now()}`;
  const newStudent: WorkspaceStudent = {
    ...student,
    id: studentId,
    stats: student.stats ?? {},
    netPriceProfile: student.netPriceProfile ?? {},
    savedColleges: student.savedColleges ?? [],
  };

  const workspaceRef = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(workspaceRef);
  if (!snap.exists()) throw new Error("Workspace not found");

  const students = (snap.data().students ?? []) as WorkspaceStudent[];
  await updateDoc(workspaceRef, {
    students: [...students, newStudent],
    updatedAt: serverTimestamp(),
  });
  return newStudent;
}

export async function updateStudent(
  workspaceId: string,
  studentId: string,
  updates: Partial<Omit<WorkspaceStudent, "id">>
): Promise<void> {
  const workspaceRef = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(workspaceRef);
  if (!snap.exists()) throw new Error("Workspace not found");

  const students = (snap.data().students ?? []) as WorkspaceStudent[];
  const idx = students.findIndex((s) => s.id === studentId);
  if (idx === -1) throw new Error("Student not found");

  const existing = students[idx];
  const merged: WorkspaceStudent = {
    ...existing,
    ...updates,
    stats: updates.stats
      ? { ...(existing.stats ?? {}), ...updates.stats }
      : existing.stats,
    netPriceProfile: updates.netPriceProfile
      ? { ...(existing.netPriceProfile ?? {}), ...updates.netPriceProfile }
      : existing.netPriceProfile,
  };
  students[idx] = merged;
  await updateDoc(workspaceRef, {
    students,
    updatedAt: serverTimestamp(),
  });
}

export async function removeStudent(
  workspaceId: string,
  studentId: string
): Promise<void> {
  const workspaceRef = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(workspaceRef);
  if (!snap.exists()) throw new Error("Workspace not found");

  const students = (snap.data().students ?? []).filter(
    (s: WorkspaceStudent) => s.id !== studentId
  );
  await updateDoc(workspaceRef, {
    students,
    updatedAt: serverTimestamp(),
  });
}
