import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import type { WorkspaceStudent } from "@/types/workspace";
import type { WorkspaceWithId } from "@/hooks/useWorkspaces";

interface WorkspaceContextType {
  activeWorkspace: WorkspaceWithId | null;
  activeStudent: WorkspaceStudent | null;
  setActiveStudent: (student: WorkspaceStudent | null) => void;
  students: WorkspaceStudent[];
  addStudent: (student: Omit<WorkspaceStudent, "id">) => Promise<WorkspaceStudent>;
  updateStudent: (
    studentId: string,
    updates: Partial<Omit<WorkspaceStudent, "id">>
  ) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (ctx === undefined) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { currentUser } = useAuth();
  const {
    workspace,
    students,
    activeStudent,
    setActiveStudent,
    addStudent,
    updateStudent,
    removeStudent,
    loading,
  } = useWorkspaces(currentUser);

  const value = useMemo(
    () => ({
      activeWorkspace: workspace,
      activeStudent,
      setActiveStudent,
      students,
      addStudent,
      updateStudent,
      removeStudent,
      loading,
    }),
    [
      workspace,
      activeStudent,
      setActiveStudent,
      students,
      addStudent,
      updateStudent,
      removeStudent,
      loading,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
