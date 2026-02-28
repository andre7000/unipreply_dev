import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { ChevronDown, ChevronUp, ExternalLink, GraduationCap, DollarSign, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Scholarship {
  id: string;
  name: string;
  rawText: string;
  amount?: string;
  deadline?: string;
  eligibility?: string[];
  sourceUrl?: string;
  studentType: "first-year" | "transfer" | "both";
}

interface ScholarshipDisplayProps {
  collegeId: string;
}

function ScholarshipCard({ scholarship }: { scholarship: Scholarship }) {
  const [expanded, setExpanded] = useState(false);

  const studentTypeBadge = {
    "first-year": { label: "First-Year", color: "bg-blue-100 text-blue-800" },
    "transfer": { label: "Transfer", color: "bg-purple-100 text-purple-800" },
    "both": { label: "All Students", color: "bg-gray-100 text-gray-800" },
  };

  const badge = studentTypeBadge[scholarship.studentType] || studentTypeBadge.both;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="font-semibold text-gray-900">{scholarship.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
              {badge.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
            {scholarship.amount && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-700">{scholarship.amount}</span>
              </div>
            )}
            {scholarship.deadline && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Deadline:</span>
                <span>{scholarship.deadline}</span>
              </div>
            )}
          </div>

          {scholarship.eligibility && scholarship.eligibility.length > 0 && !expanded && (
            <p className="text-sm text-gray-500 line-clamp-1">
              {scholarship.eligibility.slice(0, 2).join(" • ")}
              {scholarship.eligibility.length > 2 && " ..."}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {scholarship.rawText}
          </div>

          {scholarship.sourceUrl && (
            <a
              href={scholarship.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              View on college website
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

export function ScholarshipDisplay({ collegeId }: ScholarshipDisplayProps) {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "first-year" | "transfer">("all");

  useEffect(() => {
    async function fetchScholarships() {
      if (!collegeId) return;

      setLoading(true);
      setError(null);

      try {
        const scholarshipsRef = collection(db, "scholarships");
        const q = query(scholarshipsRef, where("collegeId", "==", collegeId));
        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Scholarship[];

        setScholarships(data);
      } catch (err) {
        console.error("Error fetching scholarships:", err);
        setError("Failed to load scholarships");
      } finally {
        setLoading(false);
      }
    }

    fetchScholarships();
  }, [collegeId]);

  const filteredScholarships = scholarships.filter((s) => {
    if (filter === "all") return true;
    return s.studentType === filter || s.studentType === "both";
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading scholarships...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {error}
      </div>
    );
  }

  if (scholarships.length === 0) {
    return (
      <div className="text-center py-8">
        <GraduationCap className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No scholarships found for this college yet.</p>
        <p className="text-sm text-gray-400 mt-1">
          Check back later or visit the college website for scholarship information.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Scholarships ({filteredScholarships.length})
        </h3>
        <div className="flex gap-1">
          {(["all", "first-year", "transfer"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type === "all" ? "All" : type === "first-year" ? "First-Year" : "Transfer"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredScholarships.map((scholarship) => (
          <ScholarshipCard key={scholarship.id} scholarship={scholarship} />
        ))}
      </div>

      {scholarships[0]?.sourceUrl && (
        <div className="pt-4 border-t">
          <a
            href={scholarships[0].sourceUrl.split("#")[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            View all scholarships on college website
          </a>
        </div>
      )}
    </div>
  );
}
