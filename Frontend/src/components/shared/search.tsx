import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type ApiResponse } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface FamilySearchResult {
  id: string;
  familyName: string;
  referenceId: string;
  nativePlace: string;
  totalPeople: number;
  gotraName: string;
}

export interface PersonSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  dob: string;
  originalNative: string;
  familyId: string;
  familyName: string;
  familyNativePlace: string;
}

interface BackendFamilySearchItem {
  familyId: number | string;
  referenceId: number | string | null;
  familyName: string;
  nativePlace: string | null;
  totalPeople: number;
  gotraName: string | null;
}

interface BackendPersonSearchItem {
  personId: number | string;
  firstName: string;
  lastName: string | null;
  gender: string;
  dateOfBirth: string | null;
  originalNative: string | null;
  familyId: number | string;
  familyName: string | null;
  familyNativePlace: string | null;
}

interface PaginatedSearchResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebounced(value),
      delay,
    );

    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

function normalizeFamily(
  item: BackendFamilySearchItem,
): FamilySearchResult {
  return {
    id: String(item.familyId),
    familyName: item.familyName,
    referenceId:
      item.referenceId === null ? "" : String(item.referenceId),
    nativePlace: item.nativePlace ?? "",
    totalPeople: Number(item.totalPeople) || 0,
    gotraName: item.gotraName ?? "",
  };
}

function normalizePerson(
  item: BackendPersonSearchItem,
): PersonSearchResult {
  const gender = item.gender.toLowerCase();

  return {
    id: String(item.personId),
    firstName: item.firstName,
    lastName: item.lastName ?? "",
    gender: gender === "female" ? "female" : "male",
    dob: item.dateOfBirth ?? "",
    originalNative: item.originalNative ?? "",
    familyId: String(item.familyId),
    familyName: item.familyName ?? "",
    familyNativePlace: item.familyNativePlace ?? "",
  };
}

export function FamilySearch({
  onSelect,
  placeholder = "Search by family name or native place…",
  emptyQueryBehavior = "none",
  className,
}: {
  onSelect: (family: FamilySearchResult) => void;
  placeholder?: string;
  emptyQueryBehavior?: "none" | "all";
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FamilySearchResult[]>([]);
  const [error, setError] = useState("");

  const normalizedQuery = debounced.trim();
  const showResults =
    normalizedQuery.length > 0 || emptyQueryBehavior === "all";

  useEffect(() => {
    let cancelled = false;

    async function search() {
      if (!showResults) {
        setResults([]);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "20",
        });

        if (normalizedQuery) {
          params.set("q", normalizedQuery);
        }

        const response = await api.get<
          ApiResponse<
            PaginatedSearchResponse<BackendFamilySearchItem>
          >
        >(`/search/families?${params.toString()}`);

        if (!response.success || !response.data) {
          throw new Error(
            response.message || "Family search failed.",
          );
        }

        if (!cancelled) {
          setResults(response.data.items.map(normalizeFamily));
        }
      } catch (searchError) {
        if (!cancelled) {
          setResults([]);
          setError(
            searchError instanceof Error
              ? searchError.message
              : "Unable to search families.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void search();

    return () => {
      cancelled = true;
    };
  }, [normalizedQuery, showResults]);

  const resultMessage = useMemo(() => {
    if (error) {
      return error;
    }

    return `No families match “${normalizedQuery}”.`;
  }, [error, normalizedQuery]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
          aria-label="Search families"
          type="search"
        />
      </div>

      <div
        aria-live="polite"
        aria-busy={loading}
        className="vv-scroll max-h-72 space-y-1.5 overflow-y-auto pr-1"
      >
        {loading &&
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-16 w-full rounded-xl"
            />
          ))}

        {!loading && showResults && results.length === 0 && (
          <p
            role={error ? "alert" : "status"}
            className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground"
          >
            {resultMessage}
          </p>
        )}

        {!loading &&
          results.map((family) => (
            <button
              key={family.id}
              type="button"
              onClick={() => onSelect(family)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {family.familyName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {family.nativePlace || "Native place not provided"}
                  {family.totalPeople > 0
                    ? ` · ${family.totalPeople} people`
                    : ""}
                </span>
              </span>

              {family.referenceId && (
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                  Ref {family.referenceId}
                </span>
              )}
            </button>
          ))}
      </div>
    </div>
  );
}

export function PersonSearch({
  onSelect,
  placeholder = "Search by first or last name…",
  className,
}: {
  onSelect: (person: PersonSearchResult) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [error, setError] = useState("");

  const normalizedQuery = debounced.trim();

  useEffect(() => {
    let cancelled = false;

    async function search() {
      if (!normalizedQuery) {
        setResults([]);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          q: normalizedQuery,
          page: "1",
          limit: "20",
        });

        const response = await api.get<
          ApiResponse<
            PaginatedSearchResponse<BackendPersonSearchItem>
          >
        >(`/search/persons?${params.toString()}`);

        if (!response.success || !response.data) {
          throw new Error(
            response.message || "People search failed.",
          );
        }

        if (!cancelled) {
          setResults(response.data.items.map(normalizePerson));
        }
      } catch (searchError) {
        if (!cancelled) {
          setResults([]);
          setError(
            searchError instanceof Error
              ? searchError.message
              : "Unable to search people.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void search();

    return () => {
      cancelled = true;
    };
  }, [normalizedQuery]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
          aria-label="Search people"
          type="search"
        />
      </div>

      <div
        aria-live="polite"
        aria-busy={loading}
        className="vv-scroll max-h-72 space-y-1.5 overflow-y-auto pr-1"
      >
        {loading &&
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-14 w-full rounded-xl"
            />
          ))}

        {!loading && normalizedQuery && results.length === 0 && (
          <p
            role={error ? "alert" : "status"}
            className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground"
          >
            {error || `No people match “${normalizedQuery}”.`}
          </p>
        )}

        {!loading &&
          results.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelect(person)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {person.firstName} {person.lastName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {person.gender === "male" ? "Male" : "Female"}
                  {person.dob ? ` · ${person.dob}` : ""}
                  {person.familyName
                    ? ` · ${person.familyName}`
                    : ""}
                </span>
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
