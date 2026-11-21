
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  GitBranch,
  Loader2,
  Users,
  Network,
  RefreshCw,
  UserRound,
  Heart,
  UserRoundCheck,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageFade } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  FamilyTreeGraph,
  type FamilyTreeNodeData,
  type FamilyTreeEdgeData,
} from "@/components/tree/family-tree-graph";

import { api, type ApiResponse } from "@/lib/api-client";

interface BackendFamily {
  familyId: number;
  familyName: string;
  referenceId: number | string;
  nativePlace?: string | null;
  totalMembers?: number;
  headPersonName?: string | null;
}

interface FamilyListResponse {
  totalFamilies: number;
  families: BackendFamily[];
}

interface TreeNode {
  data: FamilyTreeNodeData;
}

interface TreeEdge {
  data: FamilyTreeEdgeData;
}

interface FamilyTreeResponse {
  family: {
    Family_Id: number;
    Family_Name: string;
    Reference_Id: number | string;
    Native_Place: string | null;
    Gotra_Id: number | null;
  };

  headPerson: {
    personId: number;
    fullName: string;
    gender: string;
    dob: string | null;
  } | null;

  nodes: TreeNode[];
  edges: TreeEdge[];

  meta: {
    totalNodes: number;
    totalEdges: number;
    familyMembers: number;
    connectedMembers: number;
    maxDepth: number;
    truncated: boolean;
  };
}

interface RelatedPeople {
  father: FamilyTreeNodeData[];
  mother: FamilyTreeNodeData[];
  spouses: FamilyTreeNodeData[];
}

const EMPTY_RELATIONS: RelatedPeople = {
  father: [],
  mother: [],
  spouses: [],
};

function addUnique(
  people: FamilyTreeNodeData[],
  person: FamilyTreeNodeData,
) {
  if (!people.some((item) => item.id === person.id)) {
    people.push(person);
  }
}

/**
 * Determines the selected person's father, mother, and spouse
 * from the relationship edges returned by the backend.
 *
 * Father/Mother:
 *   Selected person -> related parent.
 *
 * Son/Daughter:
 *   Related parent -> selected person.
 *
 * Marriage:
 *   Either edge direction identifies the spouse.
 */
function getRelatedPeople(
  selectedPerson: FamilyTreeNodeData,
  nodes: TreeNode[],
  edges: TreeEdge[],
): RelatedPeople {
  const result: RelatedPeople = {
    father: [],
    mother: [],
    spouses: [],
  };

  const peopleById = new Map(
    nodes.map((node) => [node.data.id, node.data]),
  );

  for (const edge of edges) {
    const {
      source,
      target,
      relationType,
      isMarriage,
    } = edge.data;

    const relation = relationType.trim().toLowerCase();

    // Spouse relationship.
    if (
      isMarriage ||
      relation === "husband-wife" ||
      relation === "wife-husband"
    ) {
      if (source === selectedPerson.id) {
        const spouse = peopleById.get(target);

        if (spouse) {
          addUnique(result.spouses, spouse);
        }
      }

      if (target === selectedPerson.id) {
        const spouse = peopleById.get(source);

        if (spouse) {
          addUnique(result.spouses, spouse);
        }
      }

      continue;
    }

    // Selected person is the source:
    // Father/Mother relationship points to the parent.
    if (source === selectedPerson.id) {
      if (relation === "father") {
        const father = peopleById.get(target);

        if (father) {
          addUnique(result.father, father);
        }
      }

      if (relation === "mother") {
        const mother = peopleById.get(target);

        if (mother) {
          addUnique(result.mother, mother);
        }
      }
    }

    // Selected person is the target:
    // Son/Daughter relationship identifies the parent
    // at the source, whose gender determines the parent role.
    if (
      target === selectedPerson.id &&
      (relation === "son" || relation === "daughter")
    ) {
      const parent = peopleById.get(source);

      if (!parent) {
        continue;
      }

      const gender = parent.gender.trim().toLowerCase();

      if (gender === "male") {
        addUnique(result.father, parent);
      } else if (gender === "female") {
        addUnique(result.mother, parent);
      }
    }
  }

  return result;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString();
}

interface RelatedPersonGroupProps {
  title: string;
  icon: React.ReactNode;
  people: FamilyTreeNodeData[];
  onSelect: (person: FamilyTreeNodeData) => void;
}

function RelatedPersonGroup({
  title,
  icon,
  people,
  onSelect,
}: RelatedPersonGroupProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">
          {title}
        </h3>
      </div>

      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No linked record available
        </p>
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelect(person)}
              className="w-full rounded-lg border border-border/70 bg-card p-3 text-left transition hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {person.fullName}
                  </p>

                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {person.gender || "Gender not available"}
                  </p>
                </div>

                <UserRound
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>
                  Date of birth: {formatDate(person.dob)}
                </p>

                <p className="break-words">
                  Native place:{" "}
                  {person.originalNative || "Not available"}
                </p>
              </div>

              <p className="mt-2 text-[11px] font-medium text-primary">
                Select person in tree
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TreePage() {
  const [families, setFamilies] = useState<BackendFamily[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState("");

  const [tree, setTree] = useState<FamilyTreeResponse | null>(null);

  const [selectedPerson, setSelectedPerson] =
    useState<FamilyTreeNodeData | null>(null);

  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(false);

  const [familiesError, setFamiliesError] = useState("");
  const [treeError, setTreeError] = useState("");

  // Load families.
  const loadFamilies = useCallback(async () => {
    setFamiliesLoading(true);
    setFamiliesError("");

    try {
      const response = await api.get<
        ApiResponse<FamilyListResponse>
      >("/families");

      const items = response.data?.families;

      if (!response.success || !Array.isArray(items)) {
        throw new Error(
          response.message ||
            "The family list was not returned by the server.",
        );
      }

      setFamilies(items);

      setSelectedFamilyId((current) => {
        if (
          current &&
          items.some(
            (family) => String(family.familyId) === current,
          )
        ) {
          return current;
        }

        return items[0] ? String(items[0].familyId) : "";
      });
    } catch (error) {
      setFamiliesError(
        error instanceof Error
          ? error.message
          : "Unable to load families.",
      );

      setFamilies([]);
      setSelectedFamilyId("");
    } finally {
      setFamiliesLoading(false);
    }
  }, []);

  // Load selected family tree.
  const loadTree = useCallback(async (familyId: string) => {
    if (!familyId) {
      setTree(null);
      setSelectedPerson(null);
      setTreeError("");
      return;
    }

    setTreeLoading(true);
    setTreeError("");
    setTree(null);
    setSelectedPerson(null);

    try {
      const response = await api.get<
        ApiResponse<FamilyTreeResponse>
      >(
        `/families/${encodeURIComponent(
          familyId,
        )}/tree?maxDepth=4&maxNodes=500`,
      );

      if (
        !response.success ||
        !response.data ||
        !Array.isArray(response.data.nodes) ||
        !Array.isArray(response.data.edges)
      ) {
        throw new Error(
          response.message ||
            "The family tree response is incomplete.",
        );
      }

      setTree(response.data);
    } catch (error) {
      setTreeError(
        error instanceof Error
          ? error.message
          : "Unable to load this family tree.",
      );

      setTree(null);
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFamilies();
  }, [loadFamilies]);

  useEffect(() => {
    if (selectedFamilyId) {
      void loadTree(selectedFamilyId);
    } else {
      setTree(null);
    }
  }, [selectedFamilyId, loadTree]);

  const selectedFamily = useMemo(
    () =>
      families.find(
        (family) =>
          String(family.familyId) === selectedFamilyId,
      ) ?? null,
    [families, selectedFamilyId],
  );

  const handlePersonSelect = useCallback(
    (person: FamilyTreeNodeData) => {
      setSelectedPerson(person);
    },
    [],
  );

  // Match the backend family head to its actual graph node ID.
  const rootId = useMemo(() => {
    if (!tree?.headPerson) {
      return undefined;
    }

    return tree.nodes.find(
      (node) =>
        node.data.personId === tree.headPerson?.personId,
    )?.data.id;
  }, [tree]);

  // Show relationships for the currently selected person.
  const selectedRelations = useMemo(() => {
    if (!selectedPerson || !tree) {
      return EMPTY_RELATIONS;
    }

    return getRelatedPeople(
      selectedPerson,
      tree.nodes,
      tree.edges,
    );
  }, [selectedPerson, tree]);

  const handleRefresh = () => {
    if (selectedFamilyId) {
      void loadTree(selectedFamilyId);
    } else {
      void loadFamilies();
    }
  };

  return (
    <PageFade>
      <PageHeader
        title="Family Tree"
        description="Explore family generations, parents, spouses, children, and their relationships."
        breadcrumbs={[{ label: "Family Tree" }]}
      />

      <div className="space-y-6">
        {/* Family selector */}
        <Card className="shadow-soft">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="tree-family"
                className="mb-2 block text-sm font-semibold text-foreground"
              >
                Select family
              </label>

              <select
                id="tree-family"
                value={selectedFamilyId}
                onChange={(event) =>
                  setSelectedFamilyId(event.target.value)
                }
                disabled={
                  familiesLoading || families.length === 0
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {families.length === 0 ? (
                  <option value="">No families available</option>
                ) : (
                  families.map((family) => (
                    <option
                      key={family.familyId}
                      value={String(family.familyId)}
                    >
                      {family.familyName} · Ref{" "}
                      {family.referenceId}
                    </option>
                  ))
                )}
              </select>

              {selectedFamily?.nativePlace && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Native place: {selectedFamily.nativePlace}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={familiesLoading || treeLoading}
            >
              {familiesLoading || treeLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Family loading error */}
        {familiesError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">
                Unable to load families
              </p>

              <p className="mt-1 text-muted-foreground">
                {familiesError}
              </p>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => void loadFamilies()}
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Loading and empty states */}
        {familiesLoading ? (
          <Card className="shadow-soft">
            <CardContent className="flex min-h-72 items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading families…
            </CardContent>
          </Card>
        ) : !familiesError && families.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
              <Users className="size-10 text-muted-foreground" />

              <h2 className="mt-4 font-semibold text-foreground">
                No families available
              </h2>

              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Create a family and add its members before
                exploring the family tree.
              </p>
            </CardContent>
          </Card>
        ) : treeLoading ? (
          <Card className="shadow-soft">
            <CardContent className="flex min-h-72 items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading family tree…
            </CardContent>
          </Card>
        ) : treeError ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">
                Unable to load family tree
              </p>

              <p className="mt-1 text-muted-foreground">
                {treeError}
              </p>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => void loadTree(selectedFamilyId)}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : tree ? (
          <>
            {/* Family statistics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="shadow-soft">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users className="size-5" />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Family members
                    </p>

                    <p className="text-xl font-semibold tabular-nums">
                      {tree.meta.familyMembers}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Network className="size-5" />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Connected relatives
                    </p>

                    <p className="text-xl font-semibold tabular-nums">
                      {tree.meta.connectedMembers}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <GitBranch className="size-5" />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Relationships
                    </p>

                    <p className="text-xl font-semibold tabular-nums">
                      {tree.meta.totalEdges}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Family head
                  </p>

                  <p className="mt-1 truncate text-sm font-semibold">
                    {tree.headPerson?.fullName ?? "Not available"}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {tree.headPerson?.gender ?? ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            {tree.meta.truncated && (
              <div className="rounded-lg border border-gold/40 bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                This tree has been limited by the backend
                traversal settings. Some connected relatives
                may not be displayed.
              </div>
            )}

            {/* Family graph */}
            {tree.nodes.length === 0 ? (
              <Card className="shadow-soft">
                <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
                  <GitBranch className="size-10 text-muted-foreground" />

                  <h2 className="mt-4 font-semibold">
                    No people in this family yet
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Add family members to generate the family tree.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {tree.family.Family_Name}
                  </CardTitle>

                  <p className="text-sm text-muted-foreground">
                    Parents appear above their children, spouses
                    beside their partners, and grandchildren
                    in the generations below.
                  </p>
                </CardHeader>

                <CardContent>
                  <FamilyTreeGraph
                    nodes={tree.nodes}
                    edges={tree.edges}
                    rootId={rootId}
                    selectedId={selectedPerson?.id}
                    onSelect={handlePersonSelect}
                  />
                </CardContent>
              </Card>
            )}

            {/* Selected person details */}
            {selectedPerson && (
              <>
                <Card className="shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Selected person
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Name
                      </p>

                      <p className="font-semibold">
                        {selectedPerson.fullName}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Gender
                      </p>

                      <p className="font-semibold capitalize">
                        {selectedPerson.gender || "Not available"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Date of birth
                      </p>

                      <p className="font-semibold">
                        {formatDate(selectedPerson.dob)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Native place
                      </p>

                      <p className="font-semibold">
                        {selectedPerson.originalNative ||
                          "Not available"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Parents and spouse details */}
                <Card className="shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Parents and spouse
                    </CardTitle>

                    <p className="text-sm text-muted-foreground">
                      Relationship records linked to{" "}
                      {selectedPerson.fullName}.
                      Select a person to focus on them in the tree.
                    </p>
                  </CardHeader>

                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <RelatedPersonGroup
                        title="Father"
                        icon={<UserRound className="size-4" />}
                        people={selectedRelations.father}
                        onSelect={handlePersonSelect}
                      />

                      <RelatedPersonGroup
                        title="Mother"
                        icon={<UserRound className="size-4" />}
                        people={selectedRelations.mother}
                        onSelect={handlePersonSelect}
                      />

                      <RelatedPersonGroup
                        title="Spouse"
                        icon={<Heart className="size-4" />}
                        people={selectedRelations.spouses}
                        onSelect={handlePersonSelect}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        ) : null}
      </div>
    </PageFade>
  );
}
