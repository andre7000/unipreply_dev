import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { colleges as collegeList } from "@/data/dataSource";
import {
  GraduationCap,
  Search,
  Loader2,
  DollarSign,
  Calendar,
  ExternalLink,
  Building2,
  ChevronDown,
  X,
  Filter,
} from "lucide-react";

interface Scholarship {
  id: string;
  name: string;
  rawText: string;
  amount?: string;
  deadline?: string;
  eligibility?: string[];
  sourceUrl?: string;
  collegeId: string;
  collegeName?: string;
  studentType: "first-year" | "transfer" | "both";
  scholarshipType?: string;
  createdAt?: { seconds: number };
}

const SCHOLARSHIP_TYPES = [
  { value: "all", label: "All Types" },
  { value: "merit", label: "Merit-Based" },
  { value: "need-based", label: "Need-Based" },
  { value: "athletic", label: "Athletic" },
  { value: "rotc", label: "ROTC / Military" },
  { value: "departmental", label: "Departmental" },
  { value: "diversity", label: "Diversity" },
  { value: "stem", label: "STEM" },
  { value: "arts", label: "Arts" },
  { value: "community-service", label: "Community Service" },
  { value: "general", label: "General" },
];

const STUDENT_TYPES = [
  { value: "all", label: "All Students" },
  { value: "first-year", label: "First-Year" },
  { value: "transfer", label: "Transfer" },
];

const PAGE_SIZE = 12;

function ScholarshipTypeBadge({ type }: { type?: string }) {
  const colors: Record<string, string> = {
    merit: "bg-amber-100 text-amber-800",
    "need-based": "bg-green-100 text-green-800",
    athletic: "bg-red-100 text-red-800",
    rotc: "bg-slate-100 text-slate-800",
    departmental: "bg-purple-100 text-purple-800",
    diversity: "bg-pink-100 text-pink-800",
    stem: "bg-blue-100 text-blue-800",
    arts: "bg-orange-100 text-orange-800",
    "community-service": "bg-teal-100 text-teal-800",
    general: "bg-gray-100 text-gray-800",
  };

  const label = SCHOLARSHIP_TYPES.find((t) => t.value === type)?.label || type || "General";
  const colorClass = colors[type || "general"] || colors.general;

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function StudentTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string }> = {
    "first-year": { label: "First-Year", color: "bg-blue-100 text-blue-800" },
    transfer: { label: "Transfer", color: "bg-purple-100 text-purple-800" },
    both: { label: "All Students", color: "bg-gray-100 text-gray-700" },
  };

  const { label, color } = config[type] || config.both;

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {label}
    </span>
  );
}

function ScholarshipCard({
  scholarship,
  onClick,
}: {
  scholarship: Scholarship;
  onClick: () => void;
}) {
  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 line-clamp-1">{scholarship.name}</h3>
        <ScholarshipTypeBadge type={scholarship.scholarshipType} />
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Building2 className="w-3.5 h-3.5" />
        <span className="line-clamp-1">{scholarship.collegeName || scholarship.collegeId}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {scholarship.amount && (
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="w-3.5 h-3.5 text-green-600" />
            <span className="font-medium text-green-700">{scholarship.amount}</span>
          </div>
        )}
        {scholarship.deadline && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{scholarship.deadline}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <StudentTypeBadge type={scholarship.studentType} />
        <span className="text-xs text-blue-600 hover:underline">View details →</span>
      </div>
    </Card>
  );
}

function ScholarshipModal({
  scholarship,
  open,
  onClose,
}: {
  scholarship: Scholarship | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!scholarship) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl mb-1">{scholarship.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {scholarship.collegeName || scholarship.collegeId}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <ScholarshipTypeBadge type={scholarship.scholarshipType} />
            <StudentTypeBadge type={scholarship.studentType} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {scholarship.amount && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 font-medium mb-1">
                  <DollarSign className="w-4 h-4" />
                  Amount
                </div>
                <p className="text-green-900 font-semibold">{scholarship.amount}</p>
              </div>
            )}
            {scholarship.deadline && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 font-medium mb-1">
                  <Calendar className="w-4 h-4" />
                  Deadline
                </div>
                <p className="text-amber-900 font-semibold">{scholarship.deadline}</p>
              </div>
            )}
          </div>

          {scholarship.eligibility && scholarship.eligibility.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Eligibility Requirements</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {scholarship.eligibility.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="font-medium mb-2">Full Details</h4>
            <div className="p-4 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
              {scholarship.rawText}
            </div>
          </div>

          {scholarship.sourceUrl && (
            <a
              href={scholarship.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              View on College Website
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ScholarshipsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [collegeDropdownOpen, setCollegeDropdownOpen] = useState(false);

  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchScholarships = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setLastDoc(null);
      }

      try {
        const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];

        if (collegeFilter !== "all") {
          constraints.push(where("collegeId", "==", collegeFilter));
        }

        if (typeFilter !== "all") {
          constraints.push(where("scholarshipType", "==", typeFilter));
        }

        if (studentFilter !== "all") {
          constraints.push(where("studentType", "in", [studentFilter, "both"]));
        }

        constraints.push(limit(PAGE_SIZE));

        if (isLoadMore && lastDoc) {
          constraints.push(startAfter(lastDoc));
        }

        const q = query(collection(db, "scholarships"), ...constraints);
        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Scholarship[];

        if (isLoadMore) {
          setScholarships((prev) => [...prev, ...data]);
        } else {
          setScholarships(data);
        }

        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error("Error fetching scholarships:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [collegeFilter, typeFilter, studentFilter, lastDoc]
  );

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    if (currentUser) {
      fetchScholarships(false);
    }
  }, [collegeFilter, typeFilter, studentFilter, currentUser]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchScholarships(true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loading, fetchScholarships]);

  const filteredScholarships = searchQuery
    ? scholarships.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.collegeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.rawText.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : scholarships;

  const clearFilters = () => {
    setSearchQuery("");
    setCollegeFilter("all");
    setTypeFilter("all");
    setStudentFilter("all");
  };

  const hasActiveFilters =
    searchQuery || collegeFilter !== "all" || typeFilter !== "all" || studentFilter !== "all";

  if (authLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <DashboardLayout title="Scholarships">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="w-6 h-6" />
              Scholarships
            </h1>
            <p className="text-muted-foreground">
              Browse and filter scholarships from colleges
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search scholarships..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background"
              />
            </div>

            {/* College Filter */}
            <div className="relative">
              <button
                onClick={() => setCollegeDropdownOpen(!collegeDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm bg-background"
              >
                <span className="truncate">
                  {collegeFilter === "all"
                    ? "All Schools"
                    : collegeList.find((c) => c.value === collegeFilter)?.label || collegeFilter}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0" />
              </button>
              {collegeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setCollegeFilter("all");
                      setCollegeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                      collegeFilter === "all" ? "bg-muted font-medium" : ""
                    }`}
                  >
                    All Schools
                  </button>
                  {collegeList.map((college) => (
                    <button
                      key={college.value}
                      onClick={() => {
                        setCollegeFilter(college.value);
                        setCollegeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                        collegeFilter === college.value ? "bg-muted font-medium" : ""
                      }`}
                    >
                      {college.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            >
              {SCHOLARSHIP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Student Type Filter */}
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            >
              {STUDENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {loading ? (
            "Loading..."
          ) : (
            <>
              Showing {filteredScholarships.length} scholarship
              {filteredScholarships.length !== 1 ? "s" : ""}
              {hasMore && !searchQuery && " (scroll for more)"}
            </>
          )}
        </div>

        {/* Scholarships Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading scholarships...</span>
          </div>
        ) : filteredScholarships.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No scholarships found</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScholarships.map((scholarship) => (
                <ScholarshipCard
                  key={scholarship.id}
                  scholarship={scholarship}
                  onClick={() => {
                    setSelectedScholarship(scholarship);
                    setModalOpen(true);
                  }}
                />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {!searchQuery && (
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading more...
                  </div>
                )}
                {!hasMore && scholarships.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    You've reached the end
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Scholarship Detail Modal */}
        <ScholarshipModal
          scholarship={selectedScholarship}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedScholarship(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
