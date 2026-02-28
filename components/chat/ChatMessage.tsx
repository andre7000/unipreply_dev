"use client";

import { Loader2, GraduationCap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

// Render a scholarship block with nice styling
function ScholarshipBlock({ content }: { content: string }) {
  const lines = content.trim().split('\n');
  const data: Record<string, string> = {};
  
  for (const line of lines) {
    const match = line.match(/^(SCHOLARSHIP|Amount|Deadline|Eligibility|Type|For|More Info):\s*(.+)$/i);
    if (match) {
      data[match[1].toLowerCase()] = match[2].trim();
    }
  }
  
  const name = data['scholarship'] || 'Scholarship';
  const url = data['more info'];
  
  return (
    <div className="my-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
      <div className="flex items-start gap-2 mb-2">
        <GraduationCap className="size-5 text-primary mt-0.5 shrink-0" />
        <h4 className="font-semibold text-primary">{name}</h4>
      </div>
      <div className="space-y-1.5 text-sm ml-7">
        {data['amount'] && (
          <p><span className="font-medium text-green-700">Amount:</span> {data['amount']}</p>
        )}
        {data['deadline'] && (
          <p><span className="font-medium">Deadline:</span> {data['deadline']}</p>
        )}
        {data['eligibility'] && (
          <p><span className="font-medium">Eligibility:</span> {data['eligibility']}</p>
        )}
        {data['type'] && (
          <p><span className="font-medium">Type:</span> {data['type']}</p>
        )}
        {data['for'] && (
          <p><span className="font-medium">For:</span> {data['for']}</p>
        )}
        {url && (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
          >
            <ExternalLink className="size-3" />
            View on school website
          </a>
        )}
      </div>
    </div>
  );
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

// Split content into text, table, and scholarship parts
function parseContent(content: string): Array<{ type: 'text' | 'table' | 'scholarship'; content: string }> {
  const parts: Array<{ type: 'text' | 'table' | 'scholarship'; content: string }> = [];
  
  // First, extract scholarship blocks (content between --- lines that contain SCHOLARSHIP:)
  const scholarshipPattern = /---\n([\s\S]*?SCHOLARSHIP:[\s\S]*?)---/gi;
  let lastIndex = 0;
  let match;
  
  while ((match = scholarshipPattern.exec(content)) !== null) {
    // Add text before this scholarship block
    if (match.index > lastIndex) {
      const beforeText = content.slice(lastIndex, match.index);
      if (beforeText.trim()) {
        parts.push(...parseTextAndTables(beforeText));
      }
    }
    // Add scholarship block
    parts.push({ type: 'scholarship', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining content after last scholarship block
  if (lastIndex < content.length) {
    const afterText = content.slice(lastIndex);
    if (afterText.trim()) {
      parts.push(...parseTextAndTables(afterText));
    }
  }
  
  // If no scholarship blocks found, parse normally
  if (parts.length === 0) {
    return parseTextAndTables(content);
  }
  
  return parts;
}

// Parse text and tables (original logic)
function parseTextAndTables(content: string): Array<{ type: 'text' | 'table' | 'scholarship'; content: string }> {
  const parts: Array<{ type: 'text' | 'table' | 'scholarship'; content: string }> = [];
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
          if (part.type === 'scholarship') {
            return <ScholarshipBlock key={idx} content={part.content} />;
          }
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
