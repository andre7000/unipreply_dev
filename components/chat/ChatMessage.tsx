"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

// Parse markdown-style table into rows and cells
function parseTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;
  
  // Check if this looks like a table (has | characters)
  const tableLines = lines.filter(line => line.includes('|'));
  if (tableLines.length < 2) return null;
  
  // Parse header row
  const headerLine = tableLines[0];
  const headers = headerLine
    .split('|')
    .map(cell => cell.trim())
    .filter(cell => cell.length > 0 && !cell.match(/^-+$/));
  
  if (headers.length === 0) return null;
  
  // Parse data rows (skip separator line)
  const rows: string[][] = [];
  for (let i = 1; i < tableLines.length; i++) {
    const line = tableLines[i];
    // Skip separator lines (----)
    if (line.match(/^[\s|:-]+$/)) continue;
    
    const cells = line
      .split('|')
      .map(cell => cell.trim())
      .filter((_, idx, arr) => idx > 0 || arr[0] !== ''); // Handle leading |
    
    // Filter out empty first/last cells from | at start/end
    const cleanCells = cells.filter(cell => !cell.match(/^-+$/));
    if (cleanCells.length > 0) {
      rows.push(cleanCells);
    }
  }
  
  return rows.length > 0 ? { headers, rows } : null;
}

// Render a nice styled table
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-border">
            {headers.map((header, i) => (
              <th
                key={i}
                className="text-left py-2 px-3 font-semibold bg-muted/50 first:rounded-tl last:rounded-tr"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/30">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="py-2 px-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Split content into text and table parts
function parseContent(content: string): Array<{ type: 'text' | 'table'; content: string }> {
  const parts: Array<{ type: 'text' | 'table'; content: string }> = [];
  const lines = content.split('\n');
  
  let currentText: string[] = [];
  let currentTable: string[] = [];
  let inTable = false;
  
  for (const line of lines) {
    const looksLikeTable = line.includes('|') && line.trim().length > 0;
    
    if (looksLikeTable) {
      if (!inTable && currentText.length > 0) {
        parts.push({ type: 'text', content: currentText.join('\n') });
        currentText = [];
      }
      inTable = true;
      currentTable.push(line);
    } else {
      if (inTable && currentTable.length > 0) {
        parts.push({ type: 'table', content: currentTable.join('\n') });
        currentTable = [];
      }
      inTable = false;
      currentText.push(line);
    }
  }
  
  // Push remaining content
  if (currentText.length > 0) {
    parts.push({ type: 'text', content: currentText.join('\n') });
  }
  if (currentTable.length > 0) {
    parts.push({ type: 'table', content: currentTable.join('\n') });
  }
  
  return parts;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (!content) {
    return (
      <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[85%] rounded-lg px-4 py-3",
            role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          <Loader2 className="size-4 animate-spin" />
        </div>
      </div>
    );
  }

  const parts = parseContent(content);

  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3",
          role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"
        )}
      >
        {parts.map((part, idx) => {
          if (part.type === 'table') {
            const tableData = parseTable(part.content);
            if (tableData) {
              return <Table key={idx} headers={tableData.headers} rows={tableData.rows} />;
            }
            // Fallback to text if parsing fails
            return (
              <pre key={idx} className="whitespace-pre-wrap text-sm font-mono">
                {part.content}
              </pre>
            );
          }
          return (
            <p key={idx} className="whitespace-pre-wrap text-sm">
              {part.content}
            </p>
          );
        })}
      </div>
    </div>
  );
}
