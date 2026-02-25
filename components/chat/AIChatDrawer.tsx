"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Send } from "lucide-react";

interface AIChatDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerOnly?: boolean;
}

export function AIChatDrawer({
  open = false,
  onOpenChange,
  triggerOnly = false,
}: AIChatDrawerProps) {
  if (triggerOnly) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="rounded-md border border-input"
        aria-label={open ? "Close AI advisor" : "Open AI advisor"}
        onClick={() => onOpenChange?.(!open)}
      >
        {open ? ">" : "<"}
      </Button>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h2 className="font-semibold">UniPreply Advisor</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close AI advisor"
          onClick={() => onOpenChange?.(false)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-col flex-1 min-h-0 p-4">
        <ScrollArea className="flex-1 pr-4">
          {/* Genkit Chat Interface Goes Here */}
        </ScrollArea>
        <div className="mt-4 flex gap-2 shrink-0">
          <Input
            placeholder="Ask about this college..."
            className="flex-1 min-w-0"
          />
          <Button
            size="icon"
            variant="default"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
