import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  Loader2,
  Network,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
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
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageFade } from "@/components/ui/motion";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";

import { api, type ApiResponse } from "@/lib/api-client";
import type { RelationType } from "@/types";
import { RELATION_LABELS } from "@/types";

interface BackendFamily {
  familyId: number | string;
  referenceId: number | string | null;
  familyName: string;
  nativePlace: string | null;
  gotraName?: string | null;
  totalMembers?: number;
  headPersonName?: string | null;
}

interface BackendPerson {
  personId: number | string;
  familyId: number | string;
  firstName: string;
  lastName: string | null;
  gender: string | null;
  fatherName?: string | null;
  motherName?: string | null;
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

interface BackendRelation {
  relationId: number | string;
  personId: number | string;
  relatedPersonId: number | string;
  relationType: BackendRelationType;
  direction: "OUTGOING" | "INCOMING";
  relatedPerson: {
    firstName: string;
    lastName: string | null;
    gender: string | null;
    familyId: number | string;
    familyName?: string | null;
    familyNativePlace?: string | null;
  };
}

interface FamiliesResponse {
  totalFamilies: number;
  families: BackendFamily[];
}

interface FamilyPeopleResponse {
  totalMembers: number;
  people: BackendPerson[];
}

interface PersonRelationsResponse {
  totalRelations: number;
  relations: BackendRelation[];
}

const BACKEND_TO_FRONTEND: Record<BackendRelationType, RelationType> = {
  Father: "father",
  Mother: "mother",
  Son: "son",
  Daughter: "daughter",
  Brother: "brother",
  Sister: "sister",
  "Husband-Wife": "husband_wife",
  "Wife-Husband": "wife_husband",
};

const FRONTEND_TO_BACKEND: Record<RelationType, BackendRelationType> = {
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

const SPOUSE_RELATIONS = new Set<RelationType>([
  "husband_wife",
  "wife_husband",
]);

function getPersonName(person: {
  firstName: string;
  lastName?: string | null;
} | null | undefined): string {
  if (!person) return "";
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
}

function normalizeGender(gender: string | null | undefined): string {
  return String(gender ?? "").trim().toLowerCase();
}

export function EditRelationPage() {
  const navigate = useNavigate();

  const [families, setFamilies] = useState<BackendFamily[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [familySearch, setFamilySearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<BackendFamily | null>(null);

  const [members, setMembers] = useState<BackendPerson[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<BackendPerson | null>(null);

  const [relations, setRelations] = useState<BackendRelation[]>([]);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [relationsError, setRelationsError] = useState("");

  const [editingRelation, setEditingRelation] = useState<BackendRelation | null>(null);
  const [editRelationType, setEditRelationType] = useState<RelationType | "">("");
  const [targetFamilyId, setTargetFamilyId] = useState("");
  const [targetPersonId, setTargetPersonId] = useState("");
  const [targetMembers, setTargetMembers] = useState<BackendPerson[]>([]);
  const [targetMembersLoading, setTargetMembersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingRelationId, setDeletingRelationId] = useState<string | null>(null);

  const filteredFamilies = useMemo(() => {
    const query = familySearch.trim().toLowerCase();
    if (!query) return families;

    return families.filter((family) =>
      family.familyName.toLowerCase().includes(query) ||
      (family.nativePlace ?? "").toLowerCase().includes(query) ||
      String(family.referenceId ?? "").includes(query),
    );
  }, [families, familySearch]);

  const targetFamilyOptions = useMemo(() => {
    if (!selectedFamily || !editRelationType) return [];

    // The existing API/domain rule allows cross-family spouse relationships only.
    if (SPOUSE_RELATIONS.has(editRelationType)) {
      return families.map((family) => ({
        value: String(family.familyId),
        label: family.familyName,
      }));
    }

    return [{
      value: String(selectedFamily.familyId),
      label: selectedFamily.familyName,
    }];
  }, [editRelationType, families, selectedFamily]);

  const selectedTargetPerson = targetMembers.find(
    (person) => String(person.personId) === targetPersonId,
  ) ?? null;

  // Load families once when the page opens.
  useEffect(() => {
    let cancelled = false;

    async function loadFamilies() {
      setFamiliesLoading(true);
      try {
        const response = await api.get<ApiResponse<FamiliesResponse>>("/families");
        if (!response.success || !Array.isArray(response.data?.families)) {
          throw new Error(response.message || "Could not load families.");
        }
        if (!cancelled) setFamilies(response.data.families);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load families.");
        }
      } finally {
        if (!cancelled) setFamiliesLoading(false);
      }
    }

    void loadFamilies();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load members whenever the selected family changes.
  useEffect(() => {
    if (!selectedFamily) {
      setMembers(null);
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      setMembers(null);
      setMembersLoading(true);
      setSelectedPerson(null);
      setRelations([]);
      setRelationsError("");
      setEditingRelation(null);

      try {
        const response = await api.get<ApiResponse<FamilyPeopleResponse>>(
          `/families/${encodeURIComponent(String(selectedFamily!.familyId))}/persons`,
        );
        if (!response.success || !Array.isArray(response.data?.people)) {
          throw new Error(response.message || "Could not load family members.");
        }
        if (!cancelled) setMembers(response.data.people);
      } catch (error) {
        if (!cancelled) {
          setMembers([]);
          toast.error(error instanceof Error ? error.message : "Could not load family members.");
        }
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    }

    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [selectedFamily]);

  // Load all relationships for the selected person.
  useEffect(() => {
    if (!selectedPerson) {
      setRelations([]);
      return;
    }

    let cancelled = false;

    async function loadRelations() {
      setRelationsLoading(true);
      setRelationsError("");
      setEditingRelation(null);

      try {
        const response = await api.get<ApiResponse<PersonRelationsResponse>>(
          `/persons/${encodeURIComponent(String(selectedPerson!.personId))}/relations`,
        );
        if (!response.success || !Array.isArray(response.data?.relations)) {
          throw new Error(response.message || "Could not load relationships.");
        }
        if (!cancelled) setRelations(response.data.relations);
      } catch (error) {
        if (!cancelled) {
          setRelations([]);
          setRelationsError(error instanceof Error ? error.message : "Could not load relationships.");
        }
      } finally {
        if (!cancelled) setRelationsLoading(false);
      }
    }

    void loadRelations();
    return () => {
      cancelled = true;
    };
  }, [selectedPerson]);

  // Load candidate members for the family chosen inside the edit form.
  useEffect(() => {
    if (!editingRelation || !targetFamilyId) {
      setTargetMembers([]);
      setTargetMembersLoading(false);
      return;
    }

    let cancelled = false;

    async function loadTargetMembers() {
      setTargetMembersLoading(true);
      setTargetMembers([]);

      try {
        const response = await api.get<ApiResponse<FamilyPeopleResponse>>(
          `/families/${encodeURIComponent(targetFamilyId)}/persons`,
        );
        if (!response.success || !Array.isArray(response.data?.people)) {
          throw new Error(response.message || "Could not load members of the selected family.");
        }
        if (!cancelled) setTargetMembers(response.data.people);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load family members.");
        }
      } finally {
        if (!cancelled) setTargetMembersLoading(false);
      }
    }

    void loadTargetMembers();
    return () => {
      cancelled = true;
    };
  }, [editingRelation, targetFamilyId]);

  async function refreshRelations(personId: number | string) {
    const response = await api.get<ApiResponse<PersonRelationsResponse>>(
      `/persons/${encodeURIComponent(String(personId))}/relations`,
    );
    if (!response.success || !Array.isArray(response.data?.relations)) {
      throw new Error(response.message || "Could not refresh relationships.");
    }
    setRelations(response.data.relations);
  }

  function startEditing(relation: BackendRelation) {
    const mappedType = BACKEND_TO_FRONTEND[relation.relationType];
    setEditingRelation(relation);
    setEditRelationType(mappedType);
    setTargetFamilyId(String(relation.relatedPerson.familyId));
    setTargetPersonId(String(relation.relatedPersonId));
  }

  function cancelEditing() {
    setEditingRelation(null);
    setEditRelationType("");
    setTargetFamilyId("");
    setTargetPersonId("");
    setTargetMembers([]);
  }

  function handleRelationTypeChange(value: string) {
    const nextType = value as RelationType | "";
    setEditRelationType(nextType);

    if (
      nextType &&
      !SPOUSE_RELATIONS.has(nextType) &&
      selectedFamily &&
      targetFamilyId !== String(selectedFamily.familyId)
    ) {
      // Non-spouse relationships must stay within the selected person's family.
      setTargetFamilyId(String(selectedFamily.familyId));
      setTargetPersonId("");
    }
  }

  async function handleSaveEdit() {
    if (!selectedPerson || !editingRelation) return;

    if (!editRelationType) {
      toast.error("Please select a relationship type.");
      return;
    }
    if (!targetFamilyId) {
      toast.error("Please select the related person's family.");
      return;
    }
    if (!targetPersonId || !selectedTargetPerson) {
      toast.error("Please select the related person.");
      return;
    }
    if (String(selectedPerson.personId) === targetPersonId) {
      toast.error("A person cannot be related to themselves.");
      return;
    }
    if (
      !SPOUSE_RELATIONS.has(editRelationType) &&
      String(selectedPerson.familyId) !== targetFamilyId
    ) {
      toast.error("Non-spouse relationships must be within the same family.");
      return;
    }

    setSaving(true);
    try {
      const response = await api.put<ApiResponse<{ relation: unknown }>>(
        `/relations/${editingRelation.relationId}`,
        {
          // The relationship type is expressed from the selected person's perspective.
          personId: selectedPerson.personId,
          relatedPersonId: Number(targetPersonId),
          relationType: FRONTEND_TO_BACKEND[editRelationType],
        },
      );

      if (!response.success) {
        throw new Error(response.message || "Could not update relationship.");
      }

      toast.success("Relationship updated", {
        description: `${RELATION_LABELS[editRelationType]} relationship saved successfully.`,
      });

      cancelEditing();
      await refreshRelations(selectedPerson.personId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update relationship.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(relation: BackendRelation) {
    const relatedName = getPersonName(relation.relatedPerson);
    const confirmed = window.confirm(
      `Delete the ${relation.relationType} relationship between ${getPersonName(selectedPerson)} and ${relatedName}? The reverse relationship will also be deleted.`,
    );
    if (!confirmed) return;

    setDeletingRelationId(String(relation.relationId));
    try {
      const response = await api.delete<ApiResponse<{ relationId: number | string }>>(
        `/relations/${relation.relationId}`,
      );
      if (!response.success) {
        throw new Error(response.message || "Could not delete relationship.");
      }
      toast.success("Relationship deleted", {
        description: `The relationship with ${relatedName} and its reverse record were removed.`,
      });
      if (editingRelation?.relationId === relation.relationId) cancelEditing();
      if (selectedPerson) await refreshRelations(selectedPerson.personId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete relationship.");
    } finally {
      setDeletingRelationId(null);
    }
  }

  function clearSelectedFamily() {
    setSelectedFamily(null);
    setMembers(null);
    setSelectedPerson(null);
    setRelations([]);
    setRelationsError("");
    cancelEditing();
    setFamilySearch("");
  }

  return (
    <PageFade>
      <PageHeader
        title="Edit Relationship"
        description="Choose a family member to review, change or remove their existing relationships. Reverse relationships are maintained automatically."
        breadcrumbs={[{ label: "Edit Relationship" }]}
      />

      <div className="space-y-6">
        {/* Step 1: Select family */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
              Select a family
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedFamily ? (
              <div className="max-w-2xl space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={familySearch}
                    onChange={(event) => setFamilySearch(event.target.value)}
                    placeholder="Search by family name, native place or reference ID…"
                    className="pl-9"
                    aria-label="Search families"
                  />
                </div>

                {familiesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                ) : filteredFamilies.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    {families.length === 0 ? "No families are available." : "No matching families found."}
                  </p>
                ) : (
                  <div className="vv-scroll max-h-72 space-y-2 overflow-y-auto pr-1">
                    {filteredFamilies.map((family) => (
                      <button
                        key={family.familyId}
                        type="button"
                        onClick={() => setSelectedFamily(family)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{family.familyName}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {family.nativePlace || "Native place not specified"}
                          </span>
                        </span>
                        {family.referenceId !== null && family.referenceId !== undefined && (
                          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                            Ref {family.referenceId}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">{selectedFamily.familyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedFamily.nativePlace || "Native place not specified"}
                    {selectedFamily.referenceId !== null ? ` · Ref ${selectedFamily.referenceId}` : ""}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={clearSelectedFamily}>
                  <X className="size-4" /> Change family
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Select person */}
        {selectedFamily && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                Select a person
              </CardTitle>
            </CardHeader>
            <CardContent>
              {membersLoading || members === null ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  This family has no members yet.
                </p>
              ) : (
                <div className="vv-scroll grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {members.map((person) => {
                    const isSelected = selectedPerson?.personId === person.personId;
                    return (
                      <button
                        key={person.personId}
                        type="button"
                        onClick={() => setSelectedPerson(person)}
                        className={isSelected
                          ? "rounded-xl border border-primary bg-primary/10 px-4 py-3 text-left text-sm font-semibold"
                          : "rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-primary/50 hover:bg-accent"}
                      >
                        <span className="block">{getPersonName(person)}</span>
                        <span className="mt-0.5 block text-xs font-normal capitalize text-muted-foreground">
                          {person.gender || "Gender not specified"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Existing relationships */}
        {selectedPerson && (
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                    Existing relationships
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Relationships of <span className="font-semibold text-foreground">{getPersonName(selectedPerson)}</span>
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void navigate({ to: "/app/relations/new" })}>
                  <Network className="size-4" /> Add relation
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {relationsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : relationsError ? (
                <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <p>{relationsError}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refreshRelations(selectedPerson.personId)}>
                    <RefreshCw className="size-4" /> Retry
                  </Button>
                </div>
              ) : relations.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No relationships have been recorded for this person.
                </p>
              ) : (
                relations.map((relation) => {
                  const frontendType = BACKEND_TO_FRONTEND[relation.relationType];
                  const isEditing = editingRelation?.relationId === relation.relationId;
                  const relatedName = getPersonName(relation.relatedPerson);
                  const relatedFamilyName = relation.relatedPerson.familyName ??
                    families.find((item) => String(item.familyId) === String(relation.relatedPerson.familyId))?.familyName ??
                    `Family ${relation.relatedPerson.familyId}`;

                  return (
                    <div key={relation.relationId} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{relatedName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {relatedFamilyName} · {relation.relatedPerson.gender || "Gender not specified"}
                          </p>
                          <span className="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                            {RELATION_LABELS[frontendType]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => isEditing ? cancelEditing() : startEditing(relation)}>
                            {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
                            {isEditing ? "Close" : "Edit"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            color="danger"
                            disabled={deletingRelationId === String(relation.relationId)}
                            onClick={() => void handleDelete(relation)}
                          >
                            {deletingRelationId === String(relation.relationId)
                              ? <Loader2 className="size-4 animate-spin" />
                              : <Trash2 className="size-4" />}
                            Delete
                          </Button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mt-4 space-y-4 border-t border-border pt-4">
                          <div className="grid gap-4 sm:grid-cols-3">
                            <FormField label="Relationship Type" htmlFor={`edit-rel-type-${relation.relationId}`} required>
                              <SearchableSelect
                                id={`edit-rel-type-${relation.relationId}`}
                                value={editRelationType}
                                onChange={handleRelationTypeChange}
                                options={RELATION_OPTIONS}
                                placeholder="Select relationship…"
                              />
                            </FormField>
                            <FormField label="Related Person's Family" htmlFor={`edit-rel-family-${relation.relationId}`} required>
                              <SearchableSelect
                                id={`edit-rel-family-${relation.relationId}`}
                                value={targetFamilyId}
                                onChange={(value) => {
                                  setTargetFamilyId(value);
                                  setTargetPersonId("");
                                }}
                                options={targetFamilyOptions}
                                placeholder="Select family…"
                                disabled={!editRelationType || targetFamilyOptions.length === 0}
                              />
                            </FormField>
                            <FormField label="Related Person" htmlFor={`edit-rel-person-${relation.relationId}`} required hint={targetMembersLoading ? "Loading members…" : undefined}>
                              <SearchableSelect
                                id={`edit-rel-person-${relation.relationId}`}
                                value={targetPersonId}
                                onChange={setTargetPersonId}
                                options={targetMembers.map((person) => ({
                                  value: String(person.personId),
                                  label: getPersonName(person),
                                }))}
                                placeholder={targetFamilyId ? "Select person…" : "Select a family first"}
                                disabled={!targetFamilyId || targetMembersLoading}
                                emptyText="No people in this family"
                              />
                            </FormField>
                          </div>

                          {editRelationType && selectedTargetPerson && (
                            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/60 px-3 py-3 text-sm">
                              <span className="font-semibold">{getPersonName(selectedPerson)}</span>
                              <ArrowRight className="size-4 text-primary" />
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{RELATION_LABELS[editRelationType]}</span>
                              <ArrowRight className="size-4 text-primary" />
                              <span className="font-semibold">{getPersonName(selectedTargetPerson)}</span>
                            </div>
                          )}

                          {editRelationType && !SPOUSE_RELATIONS.has(editRelationType) && (
                            <p className="text-xs text-muted-foreground">
                              Non-spouse relationships are restricted to people in the same family. Spouse relationships may connect different families.
                            </p>
                          )}

                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving}>Cancel</Button>
                            <Button type="button" onClick={() => void handleSaveEdit()} disabled={saving || targetMembersLoading}>
                              {saving && <Loader2 className="size-4 animate-spin" />}
                              {saving ? "Saving…" : "Save relationship"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageFade>
  );
}