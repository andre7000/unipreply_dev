import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import {
  getWorkspacesForUser,
  ensureWorkspaceForUser,
  addStudent as addStudentLib,
  updateStudent as updateStudentLib,
  removeStudent as removeStudentLib,
} from "@/lib/workspace";
import { db } from "@/config/firebaseConfig";
import type { Workspace, WorkspaceStudent } from "@/types/workspace";

export type WorkspaceWithId = Workspace & { id: string };

interface UseWorkspacesReturn {
  workspaces: WorkspaceWithId[];
  activeWorkspace: WorkspaceWithId | null;
  activeStudent: WorkspaceStudent | null;
  setActiveStudent: (student: WorkspaceStudent | null) => void;
  refreshWorkspaces: () => Promise<void>;
  addStudent: (student: Omit<WorkspaceStudent, "id">) => Promise<WorkspaceStudent>;
  updateStudent: (
    studentId: string,
    updates: Partial<Omit<WorkspaceStudent, "id">>
  ) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;
  loading: boolean;
}

export function useWorkspaces(user: User | null): UseWorkspacesReturn {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithId[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceWithId | null>(
    null
  );
  const [activeStudent, setActiveStudentInternal] =
    useState<WorkspaceStudent | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let list = await getWorkspacesForUser(user.uid);
      if (list.length === 0) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const migrated = await ensureWorkspaceForUser(
            user.uid,
            data.userType ?? "student",
            data.displayName
          );
          if (migrated) list = migrated;
        }
      }
      setWorkspaces(list);
      const first = list[0] ?? null;
      setActiveWorkspace(first);
      if (first?.students?.length) {
        setActiveStudentInternal(first.students[0]);
      } else {
        setActiveStudentInternal(null);
      }
    } catch (err) {
      console.error("Error loading workspaces:", err);
      setWorkspaces([]);
      setActiveWorkspace(null);
      setActiveStudentInternal(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setActiveStudentInternal(null);
      setLoading(false);
      return;
    }

    load();
  }, [load, user]);

  const setActiveStudent = (student: WorkspaceStudent | null) => {
    setActiveStudentInternal(student);
  };

  const refreshWorkspaces = useCallback(async () => {
    if (user) await load();
  }, [load, user]);

  const addStudent = useCallback(
    async (student: Omit<WorkspaceStudent, "id">) => {
      const ws = workspaces[0];
      if (!ws) throw new Error("No workspace");
      const s = await addStudentLib(ws.id, student);
      await refreshWorkspaces();
      return s;
    },
    [workspaces, refreshWorkspaces]
  );

  const updateStudent = useCallback(
    async (
      studentId: string,
      updates: Partial<Omit<WorkspaceStudent, "id">>
    ) => {
      const ws = workspaces[0];
      if (!ws) throw new Error("No workspace");
      await updateStudentLib(ws.id, studentId, updates);
      await refreshWorkspaces();
    },
    [workspaces, refreshWorkspaces]
  );

  const removeStudent = useCallback(
    async (studentId: string) => {
      const ws = workspaces[0];
      if (!ws) throw new Error("No workspace");
      await removeStudentLib(ws.id, studentId);
      await refreshWorkspaces();
      const next = workspaces[0]?.students?.find((s) => s.id !== studentId);
      setActiveStudentInternal(next ?? null);
    },
    [workspaces, refreshWorkspaces]
  );

  return {
    workspaces,
    activeWorkspace,
    activeStudent,
    setActiveStudent,
    refreshWorkspaces,
    addStudent,
    updateStudent,
    removeStudent,
    loading,
  };
}
