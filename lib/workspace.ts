import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import type { Workspace, WorkspaceStudent } from "@/types/workspace";

// ============ Workspace Operations ============

export async function createWorkspace(
  ownerId: string,
  name: string = "My Workspace"
): Promise<string> {
  const workspaceData = {
    name,
    ownerId,
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
  displayName?: string
): Promise<Workspace & { id: string }> {
  const list = await getWorkspacesForUser(userId);
  if (list.length > 0) return list[0];

  const workspaceId = await createWorkspace(
    userId,
    displayName ? `${displayName}'s Workspace` : "My Workspace"
  );
  
  const workspaceRef = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(workspaceRef);
  return { id: workspaceId, ...snap.data() } as Workspace & { id: string };
}

// ============ Student Operations (Subcollection) ============

export async function getStudentsForWorkspace(
  workspaceId: string
): Promise<WorkspaceStudent[]> {
  const studentsRef = collection(db, "workspaces", workspaceId, "students");
  const snapshot = await getDocs(studentsRef);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as WorkspaceStudent[];
}

export async function addStudent(
  workspaceId: string,
  student: Omit<WorkspaceStudent, "id">
): Promise<WorkspaceStudent> {
  const studentsRef = collection(db, "workspaces", workspaceId, "students");
  
  const studentData = {
    name: student.name,
    stats: student.stats ?? {},
    netPriceProfile: student.netPriceProfile ?? {},
    mySchools: student.mySchools ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(studentsRef, studentData);
  
  return {
    id: docRef.id,
    ...student,
    stats: student.stats ?? {},
    netPriceProfile: student.netPriceProfile ?? {},
    mySchools: student.mySchools ?? [],
  };
}

export async function updateStudent(
  workspaceId: string,
  studentId: string,
  updates: Partial<Omit<WorkspaceStudent, "id">>
): Promise<void> {
  const studentRef = doc(db, "workspaces", workspaceId, "students", studentId);
  const snap = await getDoc(studentRef);
  
  if (!snap.exists()) throw new Error("Student not found");

  const existing = snap.data() as Omit<WorkspaceStudent, "id">;
  
  const merged = {
    ...updates,
    // Deep merge for nested objects
    stats: updates.stats
      ? { ...(existing.stats ?? {}), ...updates.stats }
      : existing.stats,
    netPriceProfile: updates.netPriceProfile
      ? { ...(existing.netPriceProfile ?? {}), ...updates.netPriceProfile }
      : existing.netPriceProfile,
    // Arrays are replaced entirely (mySchools)
    updatedAt: serverTimestamp(),
  };

  await updateDoc(studentRef, merged);
}

export async function removeStudent(
  workspaceId: string,
  studentId: string
): Promise<void> {
  const studentRef = doc(db, "workspaces", workspaceId, "students", studentId);
  await deleteDoc(studentRef);
}

export async function getStudent(
  workspaceId: string,
  studentId: string
): Promise<WorkspaceStudent | null> {
  const studentRef = doc(db, "workspaces", workspaceId, "students", studentId);
  const snap = await getDoc(studentRef);
  
  if (!snap.exists()) return null;
  
  return {
    id: snap.id,
    ...snap.data(),
  } as WorkspaceStudent;
}
