
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  BookOpen,
  Download,
  Heart,
  LayoutList,
  Network,
  Search,
  Users,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { api, type ApiResponse } from "@/lib/api-client";

// ============================================================
// TYPES
// ============================================================

interface BackendFamily {
  familyId: number | string;
  referenceId: number | string | null;
  familyName: string;
  nativePlace: string | null;
  headDateOfBirth?: string | null;
  gotraId?: number | null;
  gotraName?: string | null;
  createdAt?: string | null;
  totalPeople?: number;
}

interface PersonCulturalDetails {
  gotra: string | null;
  sutra: string | null;
  vamsha: string | null;
  kulaDevatha: string | null;
  maneDevru: string | null;
  panchangSudhi: string | null;
  poojaVruksha: string | null;
}

interface BackendPerson {
  personId: number;
  familyId: number;
  firstName: string;
  lastName: string | null;
  fullName: string;
  gender: string | null;
  dob: string | null;
  fatherName: string | null;
  motherName: string | null;
  phoneNumber: string | null;
  mobileNumber: string | null;
  email: string | null;
  originalNative: string | null;
  currentAddress: string | null;
  culturalDetails: PersonCulturalDetails;
}

interface SpouseFamilySummary {
  familyId: number;
  familyName: string;
  referenceId: number | string | null;
  nativePlace: string | null;
  gotraId: number | null;
  gotraName: string | null;
}

interface LegacySpouseFamily {
  Family_Id: number;
  Family_Name: string;
  Reference_Id: number | string | null;
  Native_Place: string | null;
  Gotra_Id: number | null;
  Gotra_Name: string | null;
}

interface FamilySpouse extends BackendPerson {
  family?: SpouseFamilySummary | null;
}

interface FamilyChild extends BackendPerson {
  spouse?: FamilySpouse | null;
  spouses?: FamilySpouse[];
  spousePersonId?: number | null;
  children: FamilyChild[];
}

interface SiblingBranch {
  person: BackendPerson;
  spouse?: FamilySpouse | null;
  spouses?: FamilySpouse[];
  spousePersonId?: number | null;
  children: FamilyChild[];
}

interface FamilyDetailsResponse {
  family: {
    familyId: number;
    referenceId: number | string | null;
    familyName: string;
    nativePlace: string | null;
    headDob: string | null;
    gotraId: number | null;
    gotraName: string | null;
    createdAt: string | null;
  };

  headPerson: BackendPerson | null;

  spouse: FamilySpouse | null;
  spouses?: FamilySpouse[];

  spouseFamily?: SpouseFamilySummary | LegacySpouseFamily | null;

  spouseFamilies?: Array<SpouseFamilySummary | LegacySpouseFamily>;

  children: FamilyChild[];
  siblingBranches?: SiblingBranch[];
  members: BackendPerson[];

  meta: {
    totalMembers: number;
    totalChildren: number;
    totalSiblings: number;
    generationsProcessed?: number;
    truncated?: boolean;
  };
}

interface FamiliesResponse {
  totalFamilies: number;
  families: BackendFamily[];
}

interface PersonSearchResult {
  personId: number;
  firstName: string;
  lastName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  originalNative: string | null;
  familyId: number;
  familyName: string | null;
  familyNativePlace: string | null;
}

interface PersonSearchResponse {
  items: PersonSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface PersonLookupResponse {
  person: {
    personId: number;
    familyId: number;
    firstName: string;
    lastName: string | null;
  };
}

interface BloodlineRow {
  person: BackendPerson;
  spouses: FamilySpouse[];
  isHead: boolean;
  isSibling: boolean;
  depth: number;
}

interface AllFamilyDetailRow {
  person: BackendPerson;
  relationship: string;
  depth: number;
  kind: "person" | "spouse";
  isHead?: boolean;
  isSibling?: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

const CULTURAL_FIELDS: {
  key: keyof PersonCulturalDetails;
  label: string;
}[] = [
  { key: "gotra", label: "Gotra" },
  { key: "sutra", label: "Sutra" },
  { key: "vamsha", label: "Vamsha" },
  { key: "panchangSudhi", label: "Panchang Sudhi" },
  { key: "kulaDevatha", label: "Kula Devatha" },
  { key: "maneDevru", label: "Mane Devru" },
  { key: "poojaVruksha", label: "Pooja Vruksha" },
];

// ============================================================
// COMMON HELPERS
// ============================================================

function displayName(
  person: BackendPerson | null | undefined,
): string {
  if (!person) return "—";

  return (
    person.fullName ||
    [person.firstName, person.lastName]
      .filter(Boolean)
      .join(" ")
  );
}

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toLocaleDateString();
}

function personGender(person: BackendPerson): string {
  const gender = person.gender?.toLowerCase();

  if (gender === "female") return "Female";
  if (gender === "male") return "Male";

  return "Not specified";
}

function positiveId(value: unknown): number | null {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

function normalizeSpouseFamily(
  value:
    | SpouseFamilySummary
    | LegacySpouseFamily
    | null
    | undefined,
): SpouseFamilySummary | null {
  if (!value) return null;

  if ("familyId" in value) {
    return {
      familyId: Number(value.familyId),
      familyName: value.familyName,
      referenceId: value.referenceId,
      nativePlace: value.nativePlace,
      gotraId: value.gotraId,
      gotraName: value.gotraName,
    };
  }

  return {
    familyId: Number(value.Family_Id),
    familyName: value.Family_Name,
    referenceId: value.Reference_Id,
    nativePlace: value.Native_Place,
    gotraId:
      value.Gotra_Id === null
        ? null
        : Number(value.Gotra_Id),
    gotraName: value.Gotra_Name,
  };
}

// ============================================================
// SPOUSE HELPERS
// ============================================================

function getHeadSpouses(
  details: FamilyDetailsResponse,
): FamilySpouse[] {
  const source = details.spouses?.length
    ? details.spouses
    : details.spouse
      ? [details.spouse]
      : [];

  const primarySpouseId = details.spouse?.personId;

  const legacyFamily = normalizeSpouseFamily(
    details.spouseFamily,
  );

  return source.map((spouse) => ({
    ...spouse,
    family:
      spouse.family ??
      (spouse.personId === primarySpouseId
        ? legacyFamily
        : null),
  }));
}

function getChildSpouses(
  person: FamilyChild,
  memberMap: Map<number, BackendPerson>,
): FamilySpouse[] {
  const source = person.spouses?.length
    ? person.spouses
    : person.spouse
      ? [person.spouse]
      : [];

  const result = [...source];

  if (
    person.spousePersonId &&
    !result.some(
      (spouse) =>
        spouse.personId === person.spousePersonId,
    )
  ) {
    const fallback = memberMap.get(
      person.spousePersonId,
    );

    if (fallback) {
      result.push({
        ...fallback,
        family: null,
      });
    }
  }

  return result;
}

// Sibling spouse lookup.

function getSiblingSpouses(
  branch: SiblingBranch,
  memberMap: Map<number, BackendPerson>,
): FamilySpouse[] {
  const source = branch.spouses?.length
    ? branch.spouses
    : branch.spouse
      ? [branch.spouse]
      : [];

  const result = [...source];

  const spouseId = positiveId(
    branch.spousePersonId,
  );

  if (
    spouseId &&
    !result.some(
      (spouse) =>
        Number(spouse.personId) === spouseId,
    )
  ) {
    const fallback = memberMap.get(spouseId);

    if (fallback) {
      result.push({
        ...fallback,
        family: null,
      });
    }
  }

  return result;
}

// ============================================================
// BLOODLINE ROWS
// ============================================================

/**
 * Flatten the hierarchy for the table view.
 *
 * The family head and the head's siblings are all depth 0.
 * Descendants are indented by one level per generation.
 * Spouses are shown in spouse columns, not as separate bloodline rows.
 */
function flattenBloodline(
  details: FamilyDetailsResponse,
): BloodlineRow[] {
  const rows: BloodlineRow[] = [];
  const visited = new Set<number>();

  const memberMap = new Map<number, BackendPerson>();

  for (const member of details.members ?? []) {
    memberMap.set(member.personId, member);
  }

  if (details.headPerson) {
    memberMap.set(
      details.headPerson.personId,
      details.headPerson,
    );
  }

  function visit(
    person: BackendPerson,
    spouses: FamilySpouse[],
    children: FamilyChild[],
    depth: number,
    isHead: boolean,
    isSibling: boolean,
  ) {
    const personId = Number(person.personId);

    if (
      !Number.isSafeInteger(personId) ||
      visited.has(personId)
    ) {
      return;
    }

    visited.add(personId);

    rows.push({
      person,
      spouses,
      isHead,
      isSibling,
      depth,
    });

    for (const child of children ?? []) {
      visit(
        child,
        getChildSpouses(child, memberMap),
        child.children ?? [],
        depth + 1,
        false,
        false,
      );
    }
  }

  // Main line: the head first, followed by all descendants.

  if (details.headPerson) {
    visit(
      details.headPerson,
      getHeadSpouses(details),
      details.children ?? [],
      0,
      true,
      false,
    );
  }

  // Sibling branches start at the same level as the family head.

  for (const branch of details.siblingBranches ?? []) {
    visit(
      branch.person,
      getSiblingSpouses(branch, memberMap),
      branch.children ?? [],
      0,
      false,
      true,
    );
  }

  return rows;
}

/**
 * Build a complete, reading-order family list. Each person is followed by
 * their spouse(s), then their children and each child's spouse/children.
 */
function flattenAllFamilyDetails(
  details: FamilyDetailsResponse,
): AllFamilyDetailRow[] {
  const rows: AllFamilyDetailRow[] = [];
  const visitedPeople = new Set<number>();
  const visitedSpouses = new Set<number>();
  const memberMap = new Map<number, BackendPerson>();

  for (const member of details.members ?? []) {
    memberMap.set(Number(member.personId), member);
  }
  if (details.headPerson) {
    memberMap.set(Number(details.headPerson.personId), details.headPerson);
  }

  function visit(
    person: BackendPerson,
    spouses: FamilySpouse[],
    children: FamilyChild[],
    depth: number,
    relationship: string,
    isHead = false,
    isSibling = false,
  ) {
    const personId = Number(person.personId);
    if (!Number.isSafeInteger(personId) || visitedPeople.has(personId)) return;
    visitedPeople.add(personId);

    rows.push({ person, relationship, depth, kind: "person", isHead, isSibling });

    for (const spouse of spouses) {
      const spouseId = Number(spouse.personId);
      if (!Number.isSafeInteger(spouseId) || visitedSpouses.has(spouseId)) continue;
      visitedSpouses.add(spouseId);
      rows.push({
        person: spouse,
        relationship: `Spouse of ${displayName(person)}`,
        depth: depth + 1,
        kind: "spouse",
      });
    }

    for (const child of children ?? []) {
      visit(
        child,
        getChildSpouses(child, memberMap),
        child.children ?? [],
        depth + 1,
        `Child of ${displayName(person)}`,
      );
    }
  }

  if (details.headPerson) {
    visit(
      details.headPerson,
      getHeadSpouses(details),
      details.children ?? [],
      0,
      "Family head",
      true,
    );
  }

  for (const branch of details.siblingBranches ?? []) {
    visit(
      branch.person,
      getSiblingSpouses(branch, memberMap),
      branch.children ?? [],
      0,
      "Sibling of family head",
      false,
      true,
    );
  }

  return rows;
}

// ============================================================
// MAIN PAGE
// ============================================================

export function FamilyDetailsPage() {
  const search = useSearch({
    from: "/app/family-details",
  });

  const [families, setFamilies] =
    useState<BackendFamily[] | null>(null);

  const [selectedFamily, setSelectedFamily] =
    useState<FamilyDetailsResponse | null>(null);

  const [loadingDetails, setLoadingDetails] =
    useState(false);

  const [familySearch, setFamilySearch] =
    useState("");

  const [personQuery, setPersonQuery] =
    useState("");

  const [personResults, setPersonResults] =
    useState<PersonSearchResult[]>([]);

  const [personSearchLoading, setPersonSearchLoading] =
    useState(false);

  const [view, setView] =
    useState<"table" | "tree" | "all">("table");

  const [isDownloadingPdf, setIsDownloadingPdf] =
    useState(false);

  // ----------------------------------------------------------
  // Load families
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadFamilies() {
      try {
        const response =
          await api.get<ApiResponse<FamiliesResponse>>(
            "/families",
          );

        if (!cancelled) {
          setFamilies(response.data?.families ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setFamilies([]);

          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load families.",
          );
        }
      }
    }

    void loadFamilies();

    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------------------------------------------------
  // Search people
  // ----------------------------------------------------------

  useEffect(() => {
    const query = personQuery.trim();

    if (!query) {
      setPersonResults([]);
      setPersonSearchLoading(false);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        setPersonSearchLoading(true);

        const response = await api.get<
          ApiResponse<PersonSearchResponse>
        >(
          `/search/persons?q=${encodeURIComponent(
            query,
          )}&page=1&limit=10`,
        );

        if (!cancelled) {
          setPersonResults(response.data?.items ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setPersonResults([]);

          toast.error(
            error instanceof Error
              ? error.message
              : "Person search failed.",
          );
        }
      } finally {
        if (!cancelled) {
          setPersonSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [personQuery]);

  // ----------------------------------------------------------
  // Load family details
  // ----------------------------------------------------------

  const loadFamilyDetails = useCallback(
    async (familyId: number | string) => {
      const validId = positiveId(familyId);

      if (!validId) {
        toast.error("Invalid family ID.");
        return;
      }

      setSelectedFamily(null);
      setLoadingDetails(true);

      try {
        const response = await api.get<
          ApiResponse<FamilyDetailsResponse>
        >(
          `/families/${encodeURIComponent(
            String(validId),
          )}/details`,
        );

        if (!response.data) {
          throw new Error(
            "Family details were not returned by the server.",
          );
        }

        setSelectedFamily(response.data);
      } catch (error) {
        setSelectedFamily(null);

        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load family details.",
        );
      } finally {
        setLoadingDetails(false);
      }
    },
    [],
  );

  // ----------------------------------------------------------
  // Load a person's family
  // ----------------------------------------------------------

  const loadForPerson = useCallback(
    async (personId: number | string) => {
      const validId = positiveId(personId);

      if (!validId) {
        toast.error("Invalid person ID.");
        return;
      }

      try {
        const response = await api.get<
          ApiResponse<PersonLookupResponse>
        >(
          `/persons/${encodeURIComponent(
            String(validId),
          )}`,
        );

        const person = response.data?.person;

        const familyId = positiveId(
          person?.familyId,
        );

        if (!familyId) {
          throw new Error(
            "The selected person's family could not be found.",
          );
        }

        await loadFamilyDetails(familyId);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to find the person's family.",
        );
      }
    },
    [loadFamilyDetails],
  );

  // ----------------------------------------------------------
  // Deep link support
  // ----------------------------------------------------------

  useEffect(() => {
    if (search?.person) {
      void loadForPerson(search.person);
    }
  }, [search?.person, loadForPerson]);

  // ----------------------------------------------------------
  // Filter families
  // ----------------------------------------------------------

  const filteredFamilies = useMemo(() => {
    const query = familySearch.trim().toLowerCase();

    if (!query) return families ?? [];

    return (families ?? []).filter((family) => {
      return (
        family.familyName.toLowerCase().includes(query) ||
        String(family.referenceId ?? "")
          .toLowerCase()
          .includes(query) ||
        (family.nativePlace ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [families, familySearch]);

  // ----------------------------------------------------------
  // Selected family data
  // ----------------------------------------------------------

  const details = selectedFamily;
  const family = details?.family;
  const head = details?.headPerson ?? null;

  const headSpouses = useMemo(
    () => (details ? getHeadSpouses(details) : []),
    [details],
  );

  const bloodlineRows = useMemo(
    () => (details ? flattenBloodline(details) : []),
    [details],
  );

  const allFamilyRows = useMemo(
    () => (details ? flattenAllFamilyDetails(details) : []),
    [details],
  );

  // ----------------------------------------------------------
  // Actions
  // ----------------------------------------------------------

  function clearSelection() {
    setSelectedFamily(null);
    setPersonQuery("");
    setPersonResults([]);
  }

  async function downloadPdf() {
    if (!family || isDownloadingPdf) {
      return;
    }

    const source = document.getElementById("vv-printable");

    if (!(source instanceof HTMLElement)) {
      toast.error("Unable to find the family details to export.");
      return;
    }

    setIsDownloadingPdf(true);

    let exportContainer: HTMLDivElement | null = null;
    let exportStyle: HTMLStyleElement | null = null;

    try {
      toast.info("Generating your PDF", {
        description: "Preparing an A4 landscape download.",
      });

      // Wait for web fonts before making the temporary export copy.
      if ("fonts" in document) {
        await document.fonts.ready;
      }

      // Work on a clone so PDF sizing never changes the visible page layout.
      const exportContent = source.cloneNode(true) as HTMLElement;
      exportContent.id = "vv-pdf-printable-clone";

      exportContainer = document.createElement("div");
      exportContainer.id = "vv-pdf-export-container";
      exportContainer.setAttribute("aria-hidden", "true");
      exportContainer.appendChild(exportContent);
      document.body.appendChild(exportContainer);

      // Force a predictable landscape-width layout and remove screen-only
      // scrolling/controls from the clone before html2pdf captures it.
      exportStyle = document.createElement("style");
      exportStyle.id = "vv-pdf-export-styles";
      exportStyle.textContent = `
        #vv-pdf-export-container {
          position: fixed !important;
          left: -12000px !important;
          top: 0 !important;
          width: 1060px !important;
          z-index: -1 !important;
          pointer-events: none !important;
          background: #ffffff !important;
        }

        #vv-pdf-printable-clone {
          display: block !important;
          width: 1060px !important;
          min-width: 1060px !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 8px !important;
          background: #ffffff !important;
          color: #17221b !important;
        }

        #vv-pdf-printable-clone .vv-scroll {
          overflow: visible !important;
          max-height: none !important;
          height: auto !important;
        }

        #vv-pdf-printable-clone .min-w-max {
          min-width: 0 !important;
          width: 100% !important;
        }

        #vv-pdf-printable-clone table {
          width: 100% !important;
          min-width: 900px !important;
        }

        #vv-pdf-printable-clone .print\\:hidden {
          display: none !important;
        }

        #vv-pdf-printable-clone .shadow-soft {
          box-shadow: none !important;
        }

        #vv-pdf-printable-clone,
        #vv-pdf-printable-clone * {
          animation: none !important;
          transition: none !important;
        }

        #vv-pdf-printable-clone tr,
        #vv-pdf-printable-clone thead,
        #vv-pdf-printable-clone .rounded-xl,
        #vv-pdf-printable-clone .rounded-2xl {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      `;
      document.head.appendChild(exportStyle);

      // Give the browser a frame to apply the export-only styles.
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      });

      // Dynamically import the browser-only PDF library so it is not loaded
      // during server-side rendering.
      const { default: html2pdf } = await import("html2pdf.js");

      const safeFamilyName = (family.familyName || "family-details")
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);

      const filename = `${safeFamilyName || "family-details"}-family-details.pdf`;

      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename,
          image: {
            type: "jpeg",
            quality: 0.98,
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
            windowWidth: 1060,
            scrollX: 0,
            scrollY: 0,
            // html2canvas does not understand modern CSS color functions such
            // as oklab()/oklch(). Convert them to browser-normalized RGB in
            // the temporary cloned document before html2canvas parses styles.
            onclone: (clonedDocument: Document) => {
              const canvas = clonedDocument.createElement("canvas");
              canvas.width = 1;
              canvas.height = 1;
              const context = canvas.getContext("2d", { willReadFrequently: true });
              if (!context) return;

              const colorFunctionNames = new Set([
                "oklab",
                "oklch",
                "lab",
                "lch",
                "color",
                "color-mix",
              ]);

              // Read a CSS color through the browser's own color parser, then
              // turn it into an ordinary sRGB rgba() value for html2canvas.
              const toSrgb = (colorExpression: string): string => {
                try {
                  context.clearRect(0, 0, 1, 1);
                  context.fillStyle = "#010203";
                  context.fillStyle = colorExpression;
                  context.fillRect(0, 0, 1, 1);
                  const pixel = context.getImageData(0, 0, 1, 1).data;
                  const red = pixel[0] ?? 0;
                  const green = pixel[1] ?? 0;
                  const blue = pixel[2] ?? 0;
                  const alpha = pixel[3] ?? 255;
                  return `rgba(${red}, ${green}, ${blue}, ${
                    Number((alpha / 255).toFixed(3))
                  })`;
                } catch {
                  // A conservative fallback prevents html2canvas from seeing
                  // a CSS Color 4 function it cannot parse.
                  return "#000000";
                }
              };

              // Replace complete, potentially nested color functions. A simple
              // regular expression stops at the first ')' and can leave part
              // of nested color-mix()/var() expressions behind.
              const normalizeColors = (input: string): string => {
                let output = "";
                let index = 0;

                while (index < input.length) {
                  const match = input.slice(index).match(/^([a-zA-Z][a-zA-Z0-9-]*)\(/);
                  const functionName = match?.[1];
                  if (!functionName || !colorFunctionNames.has(functionName.toLowerCase())) {
                    output += input[index] ?? "";
                    index += 1;
                    continue;
                  }

                  const functionStart = index;
                  const openParen = index + functionName.length;
                  let depth = 0;
                  let quote: string | null = null;
                  let cursor = openParen;

                  for (; cursor < input.length; cursor += 1) {
                    const character = input[cursor];
                    if (quote) {
                      if (character === quote && input[cursor - 1] !== "\\") quote = null;
                      continue;
                    }
                    if (character === "'" || character === '"') {
                      quote = character;
                    } else if (character === "(") {
                      depth += 1;
                    } else if (character === ")") {
                      depth -= 1;
                      if (depth === 0) {
                        cursor += 1;
                        break;
                      }
                    }
                  }

                  if (depth !== 0) {
                    output += input[index];
                    index += 1;
                    continue;
                  }

                  const expression = input.slice(functionStart, cursor);
                  output += toSrgb(expression);
                  index = cursor;
                }

                return output;
              };

              const hasModernColor = (value: string) =>
                /\b(?:oklab|oklch|lab|lch|color|color-mix)\s*\(/i.test(value);

              // First sanitize all accessible stylesheet declarations, including
              // Tailwind CSS custom properties and nested media/support rules.
              const sanitizeRules = (rules: CSSRuleList): void => {
                Array.from(rules).forEach((rule) => {
                  if (rule instanceof CSSStyleRule) {
                    const declaration = rule.style;
                    for (let i = declaration.length - 1; i >= 0; i -= 1) {
                      const property = declaration.item(i);
                      const value = declaration.getPropertyValue(property);
                      if (hasModernColor(value)) {
                        declaration.setProperty(
                          property,
                          normalizeColors(value),
                          declaration.getPropertyPriority(property),
                        );
                      }
                    }
                  }

                  const nestedRules = (rule as CSSGroupingRule).cssRules;
                  if (nestedRules) {
                    try {
                      sanitizeRules(nestedRules);
                    } catch {
                      // Ignore inaccessible nested rules.
                    }
                  }
                });
              };

              Array.from(clonedDocument.styleSheets).forEach((sheet) => {
                try {
                  sanitizeRules(sheet.cssRules);
                } catch {
                  // Cross-origin stylesheets cannot be inspected.
                }
              });

              // Sanitize inline declarations and custom properties.
              clonedDocument
                .querySelectorAll<HTMLElement>("[style]")
                .forEach((element) => {
                  const styleText = element.getAttribute("style");
                  if (styleText && hasModernColor(styleText)) {
                    element.setAttribute("style", normalizeColors(styleText));
                  }
                });

              // Finally inspect resolved styles on every element. This catches
              // CSS variables and inherited Tailwind values after the browser
              // has computed the cascade in the cloned document.
              const clonedView = clonedDocument.defaultView;
              if (clonedView) {
                clonedDocument.querySelectorAll<HTMLElement>("*").forEach((element) => {
                  const computed = clonedView.getComputedStyle(element);
                  for (let i = 0; i < computed.length; i += 1) {
                    const property = computed.item(i);
                    const value = computed.getPropertyValue(property);
                    if (hasModernColor(value)) {
                      element.style.setProperty(
                        property,
                        normalizeColors(value),
                        "important",
                      );
                    }
                  }
                });
              }
            },
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "landscape",
          },
        })
        .from(exportContent)
        .save();

      toast.success("PDF downloaded", {
        description: "Your family details were saved in A4 landscape format.",
      });
    } catch (error) {
      console.error("[FamilyDetailsPage] PDF export failed:", error);
      toast.error("PDF download failed", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while generating the PDF.",
      });
    } finally {
      exportContainer?.remove();
      exportStyle?.remove();
      setIsDownloadingPdf(false);
    }
  }

  async function selectSearchResult(
    person: PersonSearchResult,
  ) {
    setPersonQuery("");
    setPersonResults([]);

    await loadForPerson(person.personId);
  }

  /**
   * Open a spouse's family only if:
   * 1. The spouse has a valid family record.
   * 2. That family is different from the currently selected family.
   */

  const openSpouseFamily = useCallback(
    (spouse: FamilySpouse) => {
      const spouseFamilyId = positiveId(
        spouse.family?.familyId,
      );

      const currentFamilyId = positiveId(
        selectedFamily?.family.familyId,
      );

      if (
        !spouseFamilyId ||
        !currentFamilyId ||
        spouseFamilyId === currentFamilyId
      ) {
        return;
      }

      void loadFamilyDetails(spouseFamilyId);
    },
    [selectedFamily, loadFamilyDetails],
  );

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div>
      <PageHeader
        title="Family Details"
        description="Search a person or browse families to view a family's heritage summary and hierarchy."
        breadcrumbs={[{ label: "Family Details" }]}
        actions={
          details ? (
            <Button
              variant="outline"
              onClick={downloadPdf}
              disabled={isDownloadingPdf}
            >
              <Download className="size-4" />
              {isDownloadingPdf ? "Generating PDF..." : "Download PDF"}
            </Button>
          ) : undefined
        }
      />

      {/* ==================================================== */}
      {/* SEARCH AND FAMILY SELECTION                           */}
      {/* ==================================================== */}

      {!details && !loadingDetails ? (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <FadeIn>
            <Card className="shadow-soft">
              <CardContent className="space-y-5 p-5">
                {/* Person search */}

                <div>
                  <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Search a person
                  </h2>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      value={personQuery}
                      onChange={(event) =>
                        setPersonQuery(event.target.value)
                      }
                      placeholder="Search by first or last name…"
                      className="pl-9"
                      aria-label="Search people"
                    />
                  </div>

                  {personQuery.trim() && (
                    <div
                      className="vv-scroll mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1"
                      aria-live="polite"
                    >
                      {personSearchLoading ? (
                        Array.from({ length: 3 }).map(
                          (_, index) => (
                            <Skeleton
                              key={index}
                              className="h-14 w-full rounded-xl"
                            />
                          ),
                        )
                      ) : personResults.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                          No people match this search.
                        </p>
                      ) : (
                        personResults.map((person) => (
                          <button
                            key={person.personId}
                            type="button"
                            onClick={() =>
                              void selectSearchResult(person)
                            }
                            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                          >
                            <span className="block truncate text-sm font-semibold">
                              {[
                                person.firstName,
                                person.lastName,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            </span>

                            <span className="block truncate text-xs text-muted-foreground">
                              {person.familyName ??
                                "Unknown family"}
                              {person.familyNativePlace
                                ? ` · ${person.familyNativePlace}`
                                : ""}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Family list */}

                <div>
                  <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    All families
                  </h2>

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      value={familySearch}
                      onChange={(event) =>
                        setFamilySearch(event.target.value)
                      }
                      placeholder="Filter families…"
                      className="pl-9"
                      aria-label="Filter families"
                    />
                  </div>

                  {families === null ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map(
                        (_, index) => (
                          <Skeleton
                            key={index}
                            className="h-14 w-full rounded-xl"
                          />
                        ),
                      )}
                    </div>
                  ) : filteredFamilies.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      No matching families.
                    </p>
                  ) : (
                    <div className="vv-scroll max-h-96 space-y-1.5 overflow-y-auto pr-1">
                      {filteredFamilies.map((item) => (
                        <button
                          key={item.familyId}
                          type="button"
                          onClick={() =>
                            void loadFamilyDetails(item.familyId)
                          }
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {item.familyName}
                            </span>

                            <span className="block truncate text-xs text-muted-foreground">
                              {item.nativePlace ||
                                "Native place not specified"}
                            </span>
                          </span>

                          {item.referenceId !== null && (
                            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
                              Ref {item.referenceId}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.08}>
            <EmptyState
              icon={BookOpen}
              title="No family selected"
              description="Search for a person or pick a family to see the family summary, cultural attributes and hierarchy."
              className="h-96"
            />
          </FadeIn>
        </div>
      ) : loadingDetails ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-24 w-full rounded-2xl"
            />
          ))}
        </div>
      ) : details && family ? (
        <div id="vv-printable" className="space-y-6">
          {/* ================================================= */}
          {/* FAMILY SUMMARY                                    */}
          {/* ================================================= */}

          <FadeIn>
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-wide">
                      {family.familyName}
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      {family.nativePlace ||
                        "Native place not specified"}
                      {family.referenceId !== null
                        ? ` · Reference ${family.referenceId}`
                        : ""}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="print:hidden"
                    onClick={clearSelection}
                  >
                    <X className="size-4" />
                    Clear
                  </Button>
                </div>

                {/* Head and spouse */}

                <div className="mt-5 grid max-w-2xl gap-4">
                  <PersonSummary
                    label="Family head"
                    person={head}
                    tone="head"
                  />

                  <div className="rounded-xl border border-sage/40 bg-sage/10 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Spouse
                    </p>

                    {headSpouses.length === 0 ? (
                      <p className="mt-1 text-base font-bold">
                        —
                      </p>
                    ) : (
                      <div className="mt-1 space-y-2">
                        {headSpouses.map((spouse) => (
                          <div key={spouse.personId}>
                            <SpouseNameLink
                              spouse={spouse}
                              currentFamilyId={family.familyId}
                              onOpen={openSpouseFamily}
                              large
                            />

                            <p className="mt-1 text-xs text-muted-foreground">
                              {personGender(spouse)}
                              {spouse.dob
                                ? ` · ${formatDate(spouse.dob)}`
                                : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Heritage */}

                <div className="mt-5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Family heritage
                  </h3>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <HeritageItem
                      label="Native place"
                      value={family.nativePlace}
                    />

                    <HeritageItem
                      label="Gotra"
                      value={family.gotraName}
                    />

                    {CULTURAL_FIELDS.filter(
                      (field) => field.key !== "gotra",
                    ).map((field) => (
                      <HeritageItem
                        key={field.key}
                        label={field.label}
                        value={
                          head?.culturalDetails?.[field.key] ??
                          null
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Statistics */}

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatItem
                    label="Total members"
                    value={details.meta.totalMembers}
                  />

                  <StatItem
                    label="Descendants"
                    value={details.meta.totalChildren}
                  />

                  <StatItem
                    label="Sibling branches"
                    value={details.meta.totalSiblings}
                  />

                  <StatItem
                    label="Generations"
                    value={
                      details.meta.generationsProcessed ?? "—"
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* ================================================= */}
          {/* FAMILY DETAILS: TABLE | TREE | ALL FAMILY DETAILS */}
          {/* ================================================= */}

          <FadeIn delay={0.08}>
            <Card className="shadow-soft">
              <CardHeader className="gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Network className="size-4 text-primary" aria-hidden="true" />
                    Family Details
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Switch between the family hierarchy and the complete person-by-person family list.
                  </p>
                </div>

                <div
                  className="print:hidden flex w-full flex-wrap items-center gap-1 rounded-xl border border-[#DFE6DE] bg-[#F0F4EF] p-1 sm:w-fit"
                  role="tablist"
                  aria-label="Family details views"
                >
                  {([
                    { key: "table", label: "Table", icon: LayoutList },
                    { key: "tree", label: "Tree", icon: Network },
                    { key: "all", label: "All Family Details", icon: Users },
                  ] as const).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={view === tab.key}
                      onClick={() => setView(tab.key)}
                      className={view === tab.key
                        ? "flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#344E42] shadow-sm"
                        : "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#718078] transition-colors hover:text-foreground"}
                    >
                      <tab.icon className="size-3.5 shrink-0" aria-hidden="true" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent>
                {view === "table" ? (
                  <HierarchyTable
                    rows={bloodlineRows}
                    currentFamilyId={family.familyId}
                    onOpenPerson={loadForPerson}
                    onOpenSpouseFamily={openSpouseFamily}
                  />
                ) : view === "tree" ? (
                  <HierarchyTree
                    details={details}
                    currentFamilyId={family.familyId}
                    onOpenPerson={loadForPerson}
                    onOpenSpouseFamily={openSpouseFamily}
                  />
                ) : (
                  <AllFamilyDetailsTable
                    rows={allFamilyRows}
                    onOpenPerson={loadForPerson}
                  />
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {details.meta.truncated && (
            <div className="rounded-lg border border-gold/40 bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
              The backend limited the number of descendants returned.
              Some later generations may not be displayed.
            </div>
          )}

          <p className="print:hidden text-xs text-muted-foreground">
            The family head and the head's brothers and sisters are shown
            at the same root level. Each person's spouse is displayed
            underneath, and children, grandchildren, and later
            generations are nested beneath their parents. All Family Details
            lists every returned person in generation order without indentation.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// SUMMARY COMPONENTS
// ============================================================

function PersonSummary({
  label,
  person,
  tone,
}: {
  label: string;
  person: BackendPerson | null;
  tone: "head" | "spouse";
}) {
  return (
    <div
      className={
        tone === "head"
          ? "rounded-xl border border-gold/40 bg-gold/10 px-4 py-3"
          : "rounded-xl border border-sage/40 bg-sage/10 px-4 py-3"
      }
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-base font-bold text-foreground">
        {displayName(person)}
      </p>

      {person && (
        <p className="mt-1 text-xs text-muted-foreground">
          {personGender(person)}
          {person.dob
            ? ` · ${formatDate(person.dob)}`
            : ""}
        </p>
      )}
    </div>
  );
}

function HeritageItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg px-3 py-2 odd:bg-muted/50">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="text-sm font-semibold">
        {value || "—"}
      </p>
    </div>
  );
}

function StatItem({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-xl font-bold tabular-nums text-foreground">
        {value}
      </p>

      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

// ============================================================
// SPOUSE NAME LINK
// ============================================================

function SpouseNameLink({
  spouse,
  currentFamilyId,
  onOpen,
  large = false,
}: {
  spouse: FamilySpouse;
  currentFamilyId: number;
  onOpen: (spouse: FamilySpouse) => void;
  large?: boolean;
}) {
  const spouseFamilyId = positiveId(
    spouse.family?.familyId,
  );

  const activeFamilyId = positiveId(currentFamilyId);

  // A link is permitted only when the spouse has a valid
  // family record different from the currently selected family.

  const hasDifferentFamily =
    spouseFamilyId !== null &&
    activeFamilyId !== null &&
    spouseFamilyId !== activeFamilyId;

  const nameClass = large
    ? "text-base font-bold"
    : "text-sm font-semibold";

  if (!hasDifferentFamily) {
    return (
      <span className={`${nameClass} text-foreground`}>
        {displayName(spouse)}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(spouse)}
      className={`${nameClass} text-[#365F50] underline underline-offset-4 transition-colors hover:text-primary`}
      title={`Open ${displayName(spouse)}'s family`}
    >
      {displayName(spouse)}
    </button>
  );
}

// ============================================================
// SPOUSE DETAILS PANEL — TREE VIEW
// ============================================================

function SpouseDetailsPanel({
  spouse,
  currentFamilyId,
  onOpenSpouseFamily,
}: {
  spouse: FamilySpouse;
  currentFamilyId: number;
  onOpenSpouseFamily: (spouse: FamilySpouse) => void;
}) {
  const spouseFamily = spouse.family ?? null;

  const isDifferentFamily =
    positiveId(spouseFamily?.familyId) !== null &&
    positiveId(spouseFamily?.familyId) !==
      positiveId(currentFamilyId);

  return (
    <aside className="min-w-[250px] max-w-[330px] rounded-xl border border-sage/40 bg-sage/5 p-4">
      <div className="flex items-center gap-2">
        <Heart
          className="size-4 text-sage"
          aria-hidden="true"
        />

        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Spouse
        </p>
      </div>

      <div className="mt-1">
        <SpouseNameLink
          spouse={spouse}
          currentFamilyId={currentFamilyId}
          onOpen={onOpenSpouseFamily}
        />
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {personGender(spouse)}
        {spouse.dob
          ? ` · ${formatDate(spouse.dob)}`
          : ""}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-sage/30 pt-3 text-xs">
        <div>
          <p className="text-muted-foreground">
            Father
          </p>

          <p className="mt-0.5 break-words font-semibold text-foreground">
            {spouse.fatherName || "—"}
          </p>
        </div>

        <div>
          <p className="text-muted-foreground">
            Mother
          </p>

          <p className="mt-0.5 break-words font-semibold text-foreground">
            {spouse.motherName || "—"}
          </p>
        </div>

        <div>
          <p className="text-muted-foreground">
            Native place
          </p>

          <p className="mt-0.5 break-words font-semibold text-foreground">
            {spouse.originalNative || "—"}
          </p>
        </div>

        <div>
          <p className="text-muted-foreground">
            Gotra
          </p>

          <p className="mt-0.5 break-words font-semibold text-foreground">
            {spouse.culturalDetails?.gotra || "—"}
          </p>
        </div>
      </div>

      {isDifferentFamily && spouseFamily && (
        <div className="mt-3 border-t border-sage/30 pt-3">
          <p className="text-xs font-semibold text-foreground">
            {spouseFamily.familyName}
          </p>

          {spouseFamily.nativePlace && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {spouseFamily.nativePlace}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

// ============================================================
// FAMILY HIERARCHY TABLE
// ============================================================

function AllFamilyDetailsTable({
  rows,
  onOpenPerson,
}: {
  rows: AllFamilyDetailRow[];
  onOpenPerson: (personId: number | string) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No family details found"
        description="No family head, spouses, siblings, or descendants were returned."
      />
    );
  }

  return (
    <div className="vv-scroll -mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {["Name", "Relationship", "Gender", "Date of birth", "Native place", "Gotra"].map((heading, index) => (
              <th
                key={heading}
                className={`whitespace-nowrap border-b border-[#DDE5DD] bg-[#F3F7F3] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7970] ${index === 0 ? "rounded-tl-xl" : ""} ${index === 5 ? "rounded-tr-xl" : ""}`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.kind}-${row.person.personId}-${index}`} className={index % 2 === 0 ? "bg-card" : "bg-[#FAFCFA]"}>
              <td className="border-b border-[#DDE5DD] px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPerson(row.person.personId)}
                    className={row.kind === "spouse"
                      ? "text-left font-medium text-[#718078] underline-offset-4 hover:text-primary hover:underline"
                      : "text-left font-semibold text-[#365F50] underline-offset-4 hover:text-primary hover:underline"}
                  >
                    {displayName(row.person)}
                  </button>
                  {row.isHead && <span className="text-[10px] font-semibold uppercase text-[#B58B45]">Head</span>}
                  {row.isSibling && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700">Head's sibling</span>}
                  {row.kind === "spouse" && <Heart className="size-3 text-rose-400" aria-label="Spouse" />}
                </div>
              </td>
              <td className="border-b border-[#DDE5DD] px-4 py-3">{row.relationship}</td>
              <td className="border-b border-[#DDE5DD] px-4 py-3">{personGender(row.person)}</td>
              <td className="border-b border-[#DDE5DD] px-4 py-3">{formatDate(row.person.dob)}</td>
              <td className="border-b border-[#DDE5DD] px-4 py-3">{row.person.originalNative || "—"}</td>
              <td className="border-b border-[#DDE5DD] px-4 py-3">{row.person.culturalDetails?.gotra || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HierarchyTable({
  rows,
  currentFamilyId,
  onOpenPerson,
  onOpenSpouseFamily,
}: {
  rows: BloodlineRow[];
  currentFamilyId: number;
  onOpenPerson: (personId: number | string) => void;
  onOpenSpouseFamily: (spouse: FamilySpouse) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No family hierarchy found"
        description="The backend did not return a family head, siblings, or descendants."
      />
    );
  }

  function renderSpouseValues(
    spouses: FamilySpouse[],
    getValue: (spouse: FamilySpouse) => string | null | undefined,
  ) {
    if (spouses.length === 0) {
      return (
        <span className="text-muted-foreground">—</span>
      );
    }

    return (
      <div className="space-y-1.5">
        {spouses.map((spouse) => (
          <p
            key={spouse.personId}
            className="text-sm text-foreground"
          >
            {getValue(spouse) || "—"}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="vv-scroll -mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {[
              "Name",
              "Spouse",
              "Spouse Native",
              "Spouse Gotra",
              "Spouse Father",
              "Spouse Mother",
            ].map((heading, index) => (
              <th
                key={heading}
                className={[
                  "whitespace-nowrap bg-[#F3F7F3] px-4 py-4 text-left",
                  "text-xs font-semibold uppercase tracking-wider",
                  "text-[#6B7970] border-b border-[#DDE5DD]",
                  index === 0 ? "rounded-tl-xl" : "",
                  index === 5 ? "rounded-tr-xl" : "",
                ].join(" ")}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.person.personId}
              className={
                index % 2 === 0
                  ? "bg-card"
                  : "bg-[#FAFCFA]"
              }
            >
              <td className="border-b border-[#DDE5DD] px-4 py-4">
                <div
                  className="flex items-center gap-2"
                  style={{
                    paddingLeft: `${row.depth * 28}px`,
                  }}
                >
                  {row.depth > 0 && (
                    <span
                      className="shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    >
                      ↳
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onOpenPerson(row.person.personId)
                    }
                    className="text-left font-medium text-[#365F50] underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    {displayName(row.person)}
                  </button>

                  {row.isHead && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase text-[#B58B45]">
                      Head
                    </span>
                  )}

                  {row.isSibling && (
                    <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
                      Head's sibling
                    </span>
                  )}
                </div>
              </td>

              <td className="border-b border-[#DDE5DD] px-4 py-4">
                {row.spouses.length === 0 ? (
                  <span className="text-muted-foreground">
                    —
                  </span>
                ) : (
                  <div className="space-y-1.5">
                    {row.spouses.map((spouse) => (
                      <div key={spouse.personId}>
                        <SpouseNameLink
                          spouse={spouse}
                          currentFamilyId={currentFamilyId}
                          onOpen={onOpenSpouseFamily}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </td>

              <td className="border-b border-[#DDE5DD] px-4 py-4">
                {renderSpouseValues(
                  row.spouses,
                  (spouse) => spouse.originalNative,
                )}
              </td>

              <td className="border-b border-[#DDE5DD] px-4 py-4">
                {renderSpouseValues(
                  row.spouses,
                  (spouse) => spouse.culturalDetails?.gotra,
                )}
              </td>

              <td className="border-b border-[#DDE5DD] px-4 py-4">
                {renderSpouseValues(
                  row.spouses,
                  (spouse) => spouse.fatherName,
                )}
              </td>

              <td className="border-b border-[#DDE5DD] px-4 py-4">
                {renderSpouseValues(
                  row.spouses,
                  (spouse) => spouse.motherName,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// FAMILY HIERARCHY TREE VIEW
// ============================================================

function HierarchyTree({
  details,
  currentFamilyId,
  onOpenPerson,
  onOpenSpouseFamily,
}: {
  details: FamilyDetailsResponse;
  currentFamilyId: number;
  onOpenPerson: (personId: number | string) => void;
  onOpenSpouseFamily: (spouse: FamilySpouse) => void;
}) {
  if (!details.headPerson) {
    return (
      <EmptyState
        icon={Users}
        title="No family head found"
        description="The backend did not return a family head for this family."
      />
    );
  }

  const memberMap = new Map<number, BackendPerson>();

  for (const member of details.members ?? []) {
    memberMap.set(Number(member.personId), member);
  }

  memberMap.set(
    Number(details.headPerson.personId),
    details.headPerson,
  );

  const headSpouses = getHeadSpouses(details);
  const siblingBranches = details.siblingBranches ?? [];

  return (
    <div className="vv-scroll overflow-x-auto py-3">
      <div className="min-w-max space-y-8">
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Main family branch
          </p>

          <FamilyPersonNode
            person={details.headPerson}
            spouses={headSpouses}
            children={details.children ?? []}
            memberMap={memberMap}
            currentFamilyId={currentFamilyId}
            onOpenPerson={onOpenPerson}
            onOpenSpouseFamily={onOpenSpouseFamily}
            isHead
          />
        </section>

        <section className="border-t border-border pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Brothers and sisters of the family head
          </p>

          {siblingBranches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sibling relationships are linked to the family head.
            </p>
          ) : (
            <div className="space-y-7">
              {siblingBranches.map((branch) => (
                <FamilyPersonNode
                  key={branch.person.personId}
                  person={branch.person}
                  spouses={getSiblingSpouses(branch, memberMap)}
                  children={branch.children ?? []}
                  memberMap={memberMap}
                  currentFamilyId={currentFamilyId}
                  onOpenPerson={onOpenPerson}
                  onOpenSpouseFamily={onOpenSpouseFamily}
                  isSibling
                />
              ))}
            </div>
          )}
        </section>

        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          The family head and the head's siblings are shown at the same root level.
          Spouses appear directly below their respective person, and descendants
          are nested one level deeper for each generation.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// ROOT / DESCENDANT PERSON NODE
// ============================================================

function FamilyPersonNode({
  person,
  spouses,
  children,
  memberMap,
  currentFamilyId,
  onOpenPerson,
  onOpenSpouseFamily,
  isHead = false,
  isSibling = false,
}: {
  person: BackendPerson;
  spouses: FamilySpouse[];
  children: FamilyChild[];
  memberMap: Map<number, BackendPerson>;
  currentFamilyId: number;
  onOpenPerson: (personId: number | string) => void;
  onOpenSpouseFamily: (spouse: FamilySpouse) => void;
  isHead?: boolean;
  isSibling?: boolean;
}) {
  return (
    <div className="relative">
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PersonChip
            person={person}
            {...(isHead ? { tone: "head" as const } : {})}
            onOpen={onOpenPerson}
          />

          {isSibling && (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
              Same generation as head
            </span>
          )}
        </div>

        {/* Spouse is displayed vertically below this person. */}

        {spouses.length > 0 && (
          <div className="ml-5 flex flex-col items-start gap-3 border-l border-sage/50 py-1 pl-4">
            {spouses.map((spouse) => (
              <SpouseDetailsPanel
                key={spouse.personId}
                spouse={spouse}
                currentFamilyId={currentFamilyId}
                onOpenSpouseFamily={onOpenSpouseFamily}
              />
            ))}
          </div>
        )}
      </div>

      {/* Children start another indentation level. */}

      {children.length > 0 ? (
        <div className="ml-7 mt-4 border-l border-border pl-5">
          <div className="space-y-5">
            {children.map((child) => (
              <FamilyChildNode
                key={child.personId}
                person={child}
                memberMap={memberMap}
                currentFamilyId={currentFamilyId}
                onOpenPerson={onOpenPerson}
                onOpenSpouseFamily={onOpenSpouseFamily}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// RECURSIVE DESCENDANT NODE
// ============================================================

function FamilyChildNode({
  person,
  memberMap,
  currentFamilyId,
  onOpenPerson,
  onOpenSpouseFamily,
}: {
  person: FamilyChild;
  memberMap: Map<number, BackendPerson>;
  currentFamilyId: number;
  onOpenPerson: (personId: number | string) => void;
  onOpenSpouseFamily: (spouse: FamilySpouse) => void;
}) {
  const spouses = getChildSpouses(person, memberMap);
  const children = person.children ?? [];

  return (
    <div className="relative">
      <span
        className="absolute -left-5 top-5 h-px w-5 bg-border"
        aria-hidden="true"
      />

      <div className="flex flex-col items-start gap-2">
        <PersonChip
          person={person}
          onOpen={onOpenPerson}
        />

        {/* The spouse stays directly below their partner. */}

        {spouses.length > 0 && (
          <div className="ml-5 flex flex-col items-start gap-3 border-l border-sage/50 py-1 pl-4">
            {spouses.map((spouse) => (
              <SpouseDetailsPanel
                key={spouse.personId}
                spouse={spouse}
                currentFamilyId={currentFamilyId}
                onOpenSpouseFamily={onOpenSpouseFamily}
              />
            ))}
          </div>
        )}
      </div>

      {/* Grandchildren and later generations. */}

      {children.length > 0 && (
        <div className="ml-7 mt-4 border-l border-border pl-5">
          <div className="space-y-5">
            {children.map((child) => (
              <FamilyChildNode
                key={child.personId}
                person={child}
                memberMap={memberMap}
                currentFamilyId={currentFamilyId}
                onOpenPerson={onOpenPerson}
                onOpenSpouseFamily={onOpenSpouseFamily}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// BLOODLINE PERSON CHIP
// ============================================================

function PersonChip({
  person,
  onOpen,
  tone,
}: {
  person: BackendPerson;
  onOpen: (personId: number | string) => void;
  tone?: "head" | "spouse";
}) {
  const className =
    tone === "head"
      ? "rounded-full border border-gold bg-gold/10 px-3.5 py-2 text-sm font-bold transition-colors hover:bg-gold/20"
      : tone === "spouse"
        ? "rounded-full border border-sage/60 bg-sage/10 px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-sage/20"
        : "rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-accent";

  const genderIcon =
    person.gender?.toLowerCase() === "female"
      ? " ♀"
      : person.gender?.toLowerCase() === "male"
        ? " ♂"
        : "";

  return (
    <button
      type="button"
      onClick={() => onOpen(person.personId)}
      className={className}
    >
      {displayName(person)}
      {genderIcon}
    </button>
  );
}
