"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface CompareSchool {
  value: string;
  label: string;
}

interface CompareContextType {
  schools: CompareSchool[];
  addSchool: (school: CompareSchool) => void;
  removeSchool: (value: string) => void;
  clearSchools: () => void;
  isInCompare: (value: string) => boolean;
  canAddMore: boolean;
}

const MAX_COMPARE = 4;

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  return ctx;
}

interface CompareProviderProps {
  children: ReactNode;
}

export function CompareProvider({ children }: CompareProviderProps) {
  const [schools, setSchools] = useState<CompareSchool[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("compareSchools");
    if (stored) {
      try {
        setSchools(JSON.parse(stored));
      } catch {
        localStorage.removeItem("compareSchools");
      }
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem("compareSchools", JSON.stringify(schools));
    }
  }, [schools, loaded]);

  const addSchool = useCallback((school: CompareSchool) => {
    setSchools((prev) => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.some((s) => s.value === school.value)) return prev;
      return [...prev, school];
    });
  }, []);

  const removeSchool = useCallback((value: string) => {
    setSchools((prev) => prev.filter((s) => s.value !== value));
  }, []);

  const clearSchools = useCallback(() => {
    setSchools([]);
  }, []);

  const isInCompare = useCallback(
    (value: string) => schools.some((s) => s.value === value),
    [schools]
  );

  const canAddMore = schools.length < MAX_COMPARE;

  return (
    <CompareContext.Provider
      value={{
        schools,
        addSchool,
        removeSchool,
        clearSchools,
        isInCompare,
        canAddMore,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}
