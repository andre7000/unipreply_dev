"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/context/WorkspaceContext";
import { User } from "lucide-react";

export function StudentSelector() {
  const { students, activeStudent, setActiveStudent, loading } = useWorkspace();

  if (loading || students.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="size-4" />
        <span>—</span>
      </div>
    );
  }

  if (students.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <User className="size-4 text-muted-foreground" />
        <span>{students[0].name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <User className="size-4 text-muted-foreground shrink-0" />
      <Select
        value={activeStudent?.id ?? ""}
        onValueChange={(id) => {
          const s = students.find((x) => x.id === id);
          setActiveStudent(s ?? null);
        }}
      >
        <SelectTrigger className="w-[180px] h-8 text-sm">
          <SelectValue placeholder="Select student" />
        </SelectTrigger>
        <SelectContent>
          {students.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
