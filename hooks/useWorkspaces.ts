import { useState, useEffect, useCallback } from "react";
import type { User } from "firebase/auth";
import {
  ensureWorkspaceForUser,
  getStudentsForWorkspace,
  addStudent as addStudentLib,
  updateStudent as updateStudentLib,
  removeStudent as removeStudentLib,
} from "@/lib/workspace";
import type { Workspace, WorkspaceStudent } from "@/types/workspace";

export type WorkspaceWithId = Workspace & { id: string };

interface UseWorkspacesReturn {
  workspace: WorkspaceWithId | null;
  students: WorkspaceStudent[];
  activeStudent: WorkspaceStudent | null;
  setActiveStudent: (student: WorkspaceStudent | null) => void;
  refreshData: () => Promise<void>;
  addStudent: (student: Omit<WorkspaceStudent, "id">) => Promise<WorkspaceStudent>;
  updateStudent: (
    studentId: string,
    updates: Partial<Omit<WorkspaceStudent, "id">>
  ) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;
  loading: boolean;
}

export function useWorkspaces(user: User | null): UseWorkspacesReturn {
  const [workspace, setWorkspace] = useState<WorkspaceWithId | null>(null);
  const [students, setStudents] = useState<WorkspaceStudent[]>([]);
  const [activeStudent, setActiveStudentInternal] = useState<WorkspaceStudent | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Ensure workspace exists for user
      const displayName = user.displayName || user.email?.split("@")[0];
      const ws = await ensureWorkspaceForUser(user.uid, displayName);
      setWorkspace(ws);

      // Load students from subcollection
      const studentList = await getStudentsForWorkspace(ws.id);
      setStudents(studentList);

      // Set active student
      if (studentList.length > 0) {
        // Try to keep current active student if still exists
        const currentId = activeStudent?.id;
        const found = studentList.find((s) => s.id === currentId);
        setActiveStudentInternal(found ?? studentList[0]);
      } else {
        setActiveStudentInternal(null);
      }
    } catch (err) {
      console.error("Error loading workspace:", err);
      setWorkspace(null);
      setStudents([]);
      setActiveStudentInternal(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      setWorkspace(null);
      setStudents([]);
      setActiveStudentInternal(null);
      setLoading(false);
      return;
    }

    load();
  }, [load, user]);

  const setActiveStudent = (student: WorkspaceStudent | null) => {
    setActiveStudentInternal(student);
  };

  const refreshData = useCallback(async () => {
    if (user) await load();
  }, [load, user]);

  const addStudent = useCallback(
    async (student: Omit<WorkspaceStudent, "id">) => {
      if (!workspace) throw new Error("No workspace");
      const newStudent = await addStudentLib(workspace.id, student);
      await refreshData();
      // Set the newly added student as active
      setActiveStudentInternal(newStudent);
      return newStudent;
    },
    [workspace, refreshData]
  );

  const updateStudent = useCallback(
    async (studentId: string, updates: Partial<Omit<WorkspaceStudent, "id">>) => {
      if (!workspace) throw new Error("No workspace");
      await updateStudentLib(workspace.id, studentId, updates);
      await refreshData();
    },
    [workspace, refreshData]
  );

  const removeStudent = useCallback(
    async (studentId: string) => {
      if (!workspace) throw new Error("No workspace");
      await removeStudentLib(workspace.id, studentId);
      await refreshData();
    },
    [workspace, refreshData]
  );

  return {
    workspace,
    students,
    activeStudent,
    setActiveStudent,
    refreshData,
    addStudent,
    updateStudent,
    removeStudent,
    loading,
  };
}
