
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2, Search, X } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/ui/motion";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";

import { api, type ApiResponse } from "@/lib/api-client";
import type { RelationType } from "@/types";
import { RELATION_LABELS } from "@/types";

interface BackendFamily {
  familyId: number;
  referenceId: number | null;
  familyName: string;
  nativePlace: string | null;
  gotraName: string | null;
  totalMembers: number;
  headPersonName?: string | null;
}

interface BackendPerson {
  personId: number;
  familyId: number;
  firstName: string;
  lastName: string | null;
  gender: string | null;
  fatherName: string | null;
  motherName: string | null;
}

interface FamiliesResponse {
  totalFamilies: number;
  families: BackendFamily[];
}

interface FamilyPeopleResponse {
  totalMembers: number;
  people: BackendPerson[];
}

type BackendRelationType =
  | "Father"
  | "Mother"
  | "Son"
  | "Daughter"
  | "Brother"
  | "Sister"
  | "Husband-Wife"
  | "Wife-Husband";

interface EndState {
  family: BackendFamily | null;
  person: BackendPerson | null;
}

const EMPTY_END: EndState = {
  family: null,
  person: null,
};

const RELATION_TYPE_MAP: Record<RelationType, BackendRelationType> = {
  father: "Father",
  mother: "Mother",
  son: "Son",
  daughter: "Daughter",
  brother: "Brother",
  sister: "Sister",
  husband_wife: "Husband-Wife",
  wife_husband: "Wife-Husband",
};

const RELATION_OPTIONS = (
  Object.keys(RELATION_LABELS) as RelationType[]
).map((type) => ({
  value: type,
  label: RELATION_LABELS[type],
}));

function getPersonName(person: BackendPerson | null): string {
  if (!person) return "";

  return [person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

/** One side of the relation builder: choose a family, then a member. */
function EndCard({
  side,
  families,
  familiesLoading,
  state,
  onChange,
}: {
  side: "A" | "B";
  families: BackendFamily[];
  familiesLoading: boolean;
  state: EndState;
  onChange: (next: EndState) => void;
}) {
  const [familyQuery, setFamilyQuery] = useState("");
  const [members, setMembers] = useState<BackendPerson[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  const filteredFamilies = useMemo(() => {
    const query = familyQuery.trim().toLowerCase();

    if (!query) return families;

    return families.filter((family) => {
      return (
        family.familyName.toLowerCase().includes(query) ||
        (family.nativePlace ?? "").toLowerCase().includes(query) ||
        String(family.referenceId ?? "").includes(query)
      );
    });
  }, [families, familyQuery]);

  useEffect(() => {
    if (!state.family) {
      setMembers(null);
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      setMembers(null);
      setMembersLoading(true);

      try {
        const response = await api.get<
          ApiResponse<FamilyPeopleResponse>
        >(`/families/${state.family!.familyId}/persons`);

        if (!cancelled) {
          setMembers(response.data?.people ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setMembers([]);

          toast.error(
            error instanceof Error
              ? error.message
              : `Could not load members for family ${side}.`,
          );
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [state.family, side]);

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">
          Person {side}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {!state.family ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={familyQuery}
                onChange={(event) =>
                  setFamilyQuery(event.target.value)
                }
                placeholder={`Search family ${side} by name or native place…`}
                className="pl-9"
                aria-label={`Search family ${side}`}
              />
            </div>

            {familiesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-12 w-full rounded-xl"
                  />
                ))}
              </div>
            ) : filteredFamilies.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">
                {families.length === 0
                  ? "No families are available."
                  : "No matching families found."}
              </p>
            ) : (
              <div
                className="vv-scroll grid max-h-64 gap-1.5 overflow-y-auto pr-1"
                role="listbox"
                aria-label={`Family search results for person ${side}`}
              >
                {filteredFamilies.map((family) => (
                  <button
                    key={family.familyId}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onChange({ family, person: null });
                      setFamilyQuery("");
                    }}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    <span className="block truncate text-sm font-semibold">
                      {family.familyName}
                    </span>

                    <span className="block truncate text-xs text-muted-foreground">
                      {family.nativePlace || "Native place not specified"}
                      {family.referenceId !== null
                        ? ` · Ref ${family.referenceId}`
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {state.family.familyName}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  {state.family.nativePlace || "Native place not specified"}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(EMPTY_END);
                  setFamilyQuery("");
                }}
                aria-label={`Clear person ${side}`}
              >
                <X className="size-4" />
              </Button>
            </div>

            {membersLoading || members === null ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-10 w-full rounded-xl"
                  />
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">
                No members in this family yet.
              </p>
            ) : (
              <div
                className="vv-scroll grid max-h-56 gap-1.5 overflow-y-auto pr-1"
                role="listbox"
                aria-label={`Members of ${state.family.familyName}`}
              >
                {members.map((member) => {
                  const selected =
                    state.person?.personId === member.personId;

                  const isHead =
                    !!state.family?.headPersonName &&
                    state.family.headPersonName.trim().toLowerCase() ===
                      getPersonName(member).trim().toLowerCase();

                  return (
                    <button
                      key={member.personId}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() =>
                        onChange({
                          ...state,
                          person: member,
                        })
                      }
                      className={
                        selected
                          ? "rounded-xl border border-primary bg-primary/10 px-4 py-2 text-left text-sm font-semibold"
                          : "rounded-xl border border-border bg-card px-4 py-2 text-left text-sm font-semibold transition-colors hover:border-primary/50 hover:bg-accent"
                      }
                    >
                      {getPersonName(member)}

                      {isHead && (
                        <span className="ml-2 text-[10px] font-bold uppercase text-gold">
                          Head
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AddRelationPage() {
  const navigate = useNavigate();

  const [families, setFamilies] = useState<BackendFamily[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(true);

  const [endA, setEndA] = useState<EndState>(EMPTY_END);
  const [endB, setEndB] = useState<EndState>(EMPTY_END);

  const [relationType, setRelationType] = useState<RelationType | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFamilies() {
      try {
        const response =
          await api.get<ApiResponse<FamiliesResponse>>("/families");

        if (!cancelled) {
          setFamilies(response.data?.families ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load families.",
          );
        }
      } finally {
        if (!cancelled) {
          setFamiliesLoading(false);
        }
      }
    }

    void loadFamilies();

    return () => {
      cancelled = true;
    };
  }, []);

  const samePerson =
    !!endA.person &&
    !!endB.person &&
    endA.person.personId === endB.person.personId;

  const canSave =
    !!endA.person &&
    !!endB.person &&
    !!relationType &&
    !samePerson &&
    !saving;

  async function handleSave() {
    if (!canSave || !endA.person || !endB.person || !relationType) {
      return;
    }

    setSaving(true);

    try {
      const backendRelationType = RELATION_TYPE_MAP[relationType];

      /*
       * Direction:
       * Person A is the subject.
       * Person B is the related person.
       *
       * Example:
       * relationType = "Father" means Person B is Person A's father.
       *
       * The backend creates the reverse relationship automatically.
       */
      await api.post(
        `/persons/${endA.person.personId}/relations`,
        {
          relatedPersonId: endB.person.personId,
          relationType: backendRelationType,
        },
      );

      const label = RELATION_LABELS[relationType];

      toast.success("Relationship added", {
        description: `${getPersonName(endA.person)} — ${label} — ${getPersonName(endB.person)}`,
      });

      navigate({ to: "/app/tree" });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not add the relationship.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageFade>
      <PageHeader
        title="Add Relation"
        description="Connect two people with a relationship. The preview shows exactly what will be recorded."
        breadcrumbs={[{ label: "Add Relation" }]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <EndCard
          side="A"
          families={families}
          familiesLoading={familiesLoading}
          state={endA}
          onChange={setEndA}
        />

        <EndCard
          side="B"
          families={families}
          familiesLoading={familiesLoading}
          state={endB}
          onChange={setEndB}
        />
      </div>

      <Card className="mt-6 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">
            Relationship type
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="max-w-sm">
            <FormField
              label="Relationship Type"
              htmlFor="rel-type"
              required
            >
              <SearchableSelect
                id="rel-type"
                value={relationType}
                onChange={(value) =>
                  setRelationType(value as RelationType | "")
                }
                options={RELATION_OPTIONS}
                placeholder="Select relationship…"
              />
            </FormField>
          </div>

          {/* Live relationship preview */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/60 px-4 py-4">
            <span className="rounded-lg bg-card px-3 py-2 text-sm font-bold text-foreground">
              {endA.person
                ? getPersonName(endA.person)
                : "Person A"}
            </span>

            <span
              className="flex items-center gap-1.5 text-primary"
              aria-hidden="true"
            >
              <span className="h-px w-8 bg-current" />
              <ArrowRight className="size-4" />
            </span>

            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
              {relationType
                ? RELATION_LABELS[relationType]
                : "[relationship]"}
            </span>

            <span
              className="flex items-center gap-1.5 text-primary"
              aria-hidden="true"
            >
              <ArrowRight className="size-4" />
              <span className="h-px w-8 bg-current" />
            </span>

            <span className="rounded-lg bg-card px-3 py-2 text-sm font-bold text-foreground">
              {endB.person
                ? getPersonName(endB.person)
                : "Person B"}
            </span>

            <p className="w-full text-xs text-muted-foreground">
              {relationType
                ? `“${endB.person ? getPersonName(endB.person) : "Person B"}” is recorded as ${RELATION_LABELS[relationType].toLowerCase()} of “${endA.person ? getPersonName(endA.person) : "Person A"}”. The backend will also create the reverse relationship.`
                : "Choose a relationship type to preview the record."}
            </p>
          </div>

          {samePerson && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            >
              The same person is selected on both sides — pick two different people.
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/app" })}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
            >
              {saving && (
                <Loader2 className="size-4 animate-spin" />
              )}

              {saving ? "Saving…" : "Add Relationship"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageFade>
  );
}
