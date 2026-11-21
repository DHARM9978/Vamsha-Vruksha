import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Maximize2, Minimize2, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

// --------------------------------------------------
// Types
// --------------------------------------------------

export interface FamilyTreeNodeData {
  id: string;
  personId: number;
  familyId: number;
  firstName: string;
  lastName: string | null;
  fullName: string;
  gender: string;
  dob: string | null;
  originalNative: string | null;
  isSelectedFamilyMember: boolean;
  isFamilyHead: boolean;
}

export interface FamilyTreeEdgeData {
  id: string;
  source: string;
  target: string;
  relationType: string;
  label: string;
  isMarriage: boolean;
}

interface TreeNode {
  data: FamilyTreeNodeData;
}

interface TreeEdge {
  data: FamilyTreeEdgeData;
}

interface FamilyTreeGraphProps {
  nodes: TreeNode[];
  edges: TreeEdge[];
  rootId?: string | undefined;
  selectedId?: string | undefined;
  onSelect?: ((person: FamilyTreeNodeData) => void) | undefined;
}

interface CyElement {
  select: () => void;
}

interface CyCollection {
  unselect: () => void;
}

interface CyInstance {
  fit: (elements?: unknown, padding?: number) => void;
  zoom: (level: number) => void;
  getZoom: () => number;
  center: () => void;
  resize: () => void;
  destroy: () => void;
  on: (
    event: string,
    selector: string,
    callback: (event: {
      target: {
        id: () => string;
      };
    }) => void,
  ) => void;
  getElementById: (id: string) => CyElement;
  nodes: () => CyCollection;
}

interface GenerationNeighbor {
  id: string;
  delta: number;
  priority: number;
}

interface PositionedNode {
  x: number;
  y: number;
}

interface LayoutGroup {
  members: TreeNode[];
  parentScore: number;
  containsHead: boolean;
  minimumPersonId: number;
}

type RelationshipKind = "parent-child" | "marriage" | "sibling" | "other";

// --------------------------------------------------
// Visual configuration
// --------------------------------------------------

const MALE_FILL = "#DCEBE2";
const FEMALE_FILL = "#F4E1DA";
const HEAD_BORDER = "#C79A4A";
const SELECTED_BORDER = "#3E8B69";

const NODE_WIDTH = 215;
const NODE_HEIGHT = 132;

const HEAD_NODE_WIDTH = 230;
const HEAD_NODE_HEIGHT = 142;

// Each spouse/family unit gets one horizontal slot. The family member and
// spouse are positioned side by side in the same generation row.
const HORIZONTAL_GAP = 255;
const GROUP_GAP = 85;
const VERTICAL_GAP = 250;
const SPOUSE_VERTICAL_GAP = 168;

// --------------------------------------------------
// Utility functions
// --------------------------------------------------

function normalizeRelation(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(value: string | null): string {
  if (!value) {
    return "DOB not added";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "DOB not added";
  }

  return date.toLocaleDateString();
}

function getGenderLabel(gender: string): string {
  const normalized = gender.trim().toLowerCase();

  if (normalized === "male") return "Male";
  if (normalized === "female") return "Female";

  return "Gender not added";
}

function getParentLabel(gender: string): string {
  const normalized = gender.trim().toLowerCase();

  if (normalized === "male") return "Father";
  if (normalized === "female") return "Mother";

  return "Parent";
}

function getChildLabel(gender: string): string {
  const normalized = gender.trim().toLowerCase();

  if (normalized === "male") return "Son";
  if (normalized === "female") return "Daughter";

  return "Child";
}

// --------------------------------------------------
// Relationship interpretation
// --------------------------------------------------

function getRelationshipKind(edge: FamilyTreeEdgeData): RelationshipKind {
  const relation = normalizeRelation(edge.relationType);

  if (
    edge.isMarriage ||
    relation === "husband-wife" ||
    relation === "wife-husband"
  ) {
    return "marriage";
  }

  if (
    relation === "son" ||
    relation === "daughter" ||
    relation === "father" ||
    relation === "mother"
  ) {
    return "parent-child";
  }

  if (relation === "brother" || relation === "sister") {
    return "sibling";
  }

  return "other";
}

function getParentChildIds(
  edge: FamilyTreeEdgeData,
): { parentId: string; childId: string } | null {
  const relation = normalizeRelation(edge.relationType);

  if (relation === "son" || relation === "daughter") {
    return {
      parentId: edge.source,
      childId: edge.target,
    };
  }

  if (relation === "father" || relation === "mother") {
    return {
      parentId: edge.target,
      childId: edge.source,
    };
  }

  return null;
}

function getGenerationDelta(edge: FamilyTreeEdgeData): number {
  const kind = getRelationshipKind(edge);

  if (kind === "marriage" || kind === "sibling") {
    return 0;
  }

  const relation = normalizeRelation(edge.relationType);

  if (relation === "son" || relation === "daughter") {
    return 1;
  }

  if (relation === "father" || relation === "mother") {
    return -1;
  }

  return 0;
}

// --------------------------------------------------
// Calculate generation levels
// --------------------------------------------------

function calculateGenerations(
  nodes: TreeNode[],
  edges: TreeEdge[],
  rootId?: string,
): Map<string, number> {
  const nodeIds = new Set(nodes.map((node) => node.data.id));

  const adjacency = new Map<string, GenerationNeighbor[]>();

  for (const id of nodeIds) {
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    const { source, target } = edge.data;

    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      continue;
    }

    const kind = getRelationshipKind(edge.data);

    if (kind === "other") {
      continue;
    }

    const delta = getGenerationDelta(edge.data);

    const priority = kind === "parent-child" ? 0 : kind === "marriage" ? 1 : 2;

    const sourceNeighbors = adjacency.get(source);
    const targetNeighbors = adjacency.get(target);

    if (!sourceNeighbors || !targetNeighbors) {
      continue;
    }

    sourceNeighbors.push({
      id: target,
      delta,
      priority,
    });

    targetNeighbors.push({
      id: source,
      delta: -delta,
      priority,
    });
  }

  const generations = new Map<string, number>();

  const primaryRoot =
    (rootId && nodeIds.has(rootId) ? rootId : undefined) ??
    nodes.find((node) => node.data.isFamilyHead)?.data.id ??
    nodes[0]?.data.id;

  const hasParent = new Set<string>();

  for (const edge of edges) {
    const relationship = getParentChildIds(edge.data);

    if (relationship) {
      hasParent.add(relationship.childId);
    }
  }

  function traverseComponent(startId: string, startGeneration: number) {
    if (generations.has(startId)) {
      return;
    }

    generations.set(startId, startGeneration);

    const queue = [startId];
    let queueIndex = 0;

    while (queueIndex < queue.length) {
      const currentId = queue[queueIndex];

      queueIndex += 1;

      if (!currentId) continue;

      const currentGeneration = generations.get(currentId) ?? 0;

      const neighbors = [...(adjacency.get(currentId) ?? [])].sort(
        (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
      );

      for (const neighbor of neighbors) {
        if (generations.has(neighbor.id)) {
          continue;
        }

        generations.set(neighbor.id, currentGeneration + neighbor.delta);

        queue.push(neighbor.id);
      }
    }
  }

  if (primaryRoot) {
    traverseComponent(primaryRoot, 0);
  }

  const remainingNodes = nodes
    .filter((node) => !generations.has(node.data.id))
    .sort((a, b) => a.data.personId - b.data.personId);

  while (remainingNodes.some((node) => !generations.has(node.data.id))) {
    const unvisited = remainingNodes.filter(
      (node) => !generations.has(node.data.id),
    );

    const componentRoot =
      unvisited.find((node) => !hasParent.has(node.data.id)) ?? unvisited[0];

    if (!componentRoot) break;

    traverseComponent(componentRoot.data.id, 0);
  }

  // FIX: TreeNode stores its ID inside node.data.
  // Do not access node.id directly.
  for (const node of nodes) {
    const id = node.data.id;

    if (!generations.has(id)) {
      generations.set(id, 0);
    }
  }

  return generations;
}

// --------------------------------------------------
// Keep spouses beside each other
// --------------------------------------------------

function createSpouseGroups(
  nodes: TreeNode[],
  edges: TreeEdge[],
  generations: Map<string, number>,
): Map<string, string> {
  const parent = new Map<string, string>();

  for (const node of nodes) {
    parent.set(node.data.id, node.data.id);
  }

  function find(id: string): string {
    const currentParent = parent.get(id);

    if (!currentParent || currentParent === id) {
      return id;
    }

    const root = find(currentParent);

    parent.set(id, root);

    return root;
  }

  function union(firstId: string, secondId: string) {
    const firstRoot = find(firstId);
    const secondRoot = find(secondId);

    if (firstRoot !== secondRoot) {
      parent.set(secondRoot, firstRoot);
    }
  }

  for (const edge of edges) {
    if (getRelationshipKind(edge.data) !== "marriage") {
      continue;
    }

    const { source, target } = edge.data;

    const sourceGeneration = generations.get(source);
    const targetGeneration = generations.get(target);

    if (
      sourceGeneration === undefined ||
      targetGeneration === undefined ||
      sourceGeneration !== targetGeneration
    ) {
      continue;
    }

    union(source, target);
  }

  const groups = new Map<string, string>();

  for (const node of nodes) {
    groups.set(node.data.id, find(node.data.id));
  }

  return groups;
}

// --------------------------------------------------
// Position nodes by generation
// --------------------------------------------------

/**
 * Position the graph as a vertical family hierarchy:
 *
 * - Parent/child relationships move down one generation.
 * - Brothers and sisters remain in the same generation.
 * - A person and their spouse(s) share one horizontal family slot.
 * - Spouses appear beside the family member, at the same generation level.
 * - Children are placed below their parent family unit.
 *
 * Cytoscape coordinates are node centers, so each family unit is measured
 * using the combined horizontal width of its members.
 */
function calculateNodePositions(
  nodes: TreeNode[],
  edges: TreeEdge[],
  rootId?: string,
): Map<string, PositionedNode> {
  const positions = new Map<string, PositionedNode>();
  if (nodes.length === 0) return positions;

  const nodeById = new Map(nodes.map((node) => [node.data.id, node]));
  const generations = calculateGenerations(nodes, edges, rootId);
  const spouseGroups = createSpouseGroups(nodes, edges, generations);
  const membersByGroup = new Map<string, TreeNode[]>();

  for (const node of nodes) {
    const groupId = spouseGroups.get(node.data.id) ?? node.data.id;
    const members = membersByGroup.get(groupId) ?? [];
    members.push(node);
    membersByGroup.set(groupId, members);
  }

  const rootPersonId =
    (rootId && nodeById.has(rootId) ? rootId : undefined) ??
    nodes.find((node) => node.data.isFamilyHead)?.data.id ??
    nodes[0]?.data.id;
  if (!rootPersonId) return positions;

  const rootGroupId = spouseGroups.get(rootPersonId) ?? rootPersonId;
  const childrenByGroup = new Map<string, Set<string>>();
  const parentGroupsByChild = new Map<string, Set<string>>();

  // Build parent -> child links between couple/family units. If both parents
  // are connected to the child, they resolve to the same couple unit and the
  // relationship is stored only once.
  for (const edge of edges) {
    const relation = getParentChildIds(edge.data);
    if (!relation) continue;

    const parentGroup = spouseGroups.get(relation.parentId) ?? relation.parentId;
    const childGroup = spouseGroups.get(relation.childId) ?? relation.childId;
    if (parentGroup === childGroup || !membersByGroup.has(parentGroup) || !membersByGroup.has(childGroup)) continue;

    const children = childrenByGroup.get(parentGroup) ?? new Set<string>();
    children.add(childGroup);
    childrenByGroup.set(parentGroup, children);

    const parents = parentGroupsByChild.get(childGroup) ?? new Set<string>();
    parents.add(parentGroup);
    parentGroupsByChild.set(childGroup, parents);
  }

  // Siblings directly related to the selected family head become separate
  // root-level branches. Their own descendants remain under their branch.
  const siblingRootGroups = new Set<string>();
  for (const edge of edges) {
    if (getRelationshipKind(edge.data) !== "sibling") continue;
    const { source, target } = edge.data;
    const siblingId = source === rootPersonId ? target : target === rootPersonId ? source : null;
    if (!siblingId) continue;
    const siblingGroup = spouseGroups.get(siblingId) ?? siblingId;
    if (siblingGroup !== rootGroupId && membersByGroup.has(siblingGroup)) {
      siblingRootGroups.add(siblingGroup);
    }
  }

  const sortGroupMembers = (members: TreeNode[]) => {
    members.sort((a, b) => {
      const aRoot = a.data.id === rootPersonId;
      const bRoot = b.data.id === rootPersonId;
      if (aRoot !== bRoot) return aRoot ? -1 : 1;
      if (a.data.isSelectedFamilyMember !== b.data.isSelectedFamilyMember) {
        return a.data.isSelectedFamilyMember ? -1 : 1;
      }
      return a.data.personId - b.data.personId;
    });
  };
  for (const members of membersByGroup.values()) sortGroupMembers(members);

  const groupWidth = (groupId: string) => {
    const members = membersByGroup.get(groupId) ?? [];
    const widths = members.map((member) =>
      member.data.isFamilyHead ? HEAD_NODE_WIDTH : NODE_WIDTH,
    );
    return widths.reduce((sum, width) => sum + width, 0) + Math.max(0, members.length - 1) * 28;
  };

  const groupGap = GROUP_GAP;
  const measuredWidths = new Map<string, number>();
  const measuring = new Set<string>();

  function measure(groupId: string): number {
    const cached = measuredWidths.get(groupId);
    if (cached !== undefined) return cached;
    if (measuring.has(groupId)) return groupWidth(groupId);
    measuring.add(groupId);

    const childIds = [...(childrenByGroup.get(groupId) ?? [])]
      .filter((id) => id !== rootGroupId && !siblingRootGroups.has(id))
      .sort((a, b) => {
        const aId = Math.min(...(membersByGroup.get(a) ?? []).map((n) => n.data.personId));
        const bId = Math.min(...(membersByGroup.get(b) ?? []).map((n) => n.data.personId));
        return aId - bId;
      });

    const childWidth = childIds.reduce((sum, id) => sum + measure(id), 0) +
      Math.max(0, childIds.length - 1) * groupGap;
    const width = Math.max(groupWidth(groupId), childWidth, NODE_WIDTH);
    measuredWidths.set(groupId, width);
    measuring.delete(groupId);
    return width;
  }

  // A branch is measured and positioned as a complete subtree. This keeps
  // cousins and descendants beneath their own parent couple instead of
  // sorting every generation into one global row (the source of many crossed
  // connectors in the previous layout).
  function placeBranch(groupId: string, left: number, depth: number, visited: Set<string>) {
    if (visited.has(groupId)) return;
    visited.add(groupId);

    const width = measure(groupId);
    const centerX = left + width / 2;
    const members = membersByGroup.get(groupId) ?? [];
    const memberTotalWidth = groupWidth(groupId);
    let memberCursor = centerX - memberTotalWidth / 2;

    for (const member of members) {
      const memberWidth = member.data.isFamilyHead ? HEAD_NODE_WIDTH : NODE_WIDTH;
      positions.set(member.data.id, {
        x: memberCursor + memberWidth / 2,
        y: depth * VERTICAL_GAP,
      });
      memberCursor += memberWidth + 28;
    }

    const childIds = [...(childrenByGroup.get(groupId) ?? [])]
      .filter((id) => id !== rootGroupId && !siblingRootGroups.has(id) && !visited.has(id))
      .sort((a, b) => {
        const aId = Math.min(...(membersByGroup.get(a) ?? []).map((n) => n.data.personId));
        const bId = Math.min(...(membersByGroup.get(b) ?? []).map((n) => n.data.personId));
        return aId - bId;
      });

    const childrenWidth = childIds.reduce((sum, id) => sum + measure(id), 0) +
      Math.max(0, childIds.length - 1) * groupGap;
    let childCursor = centerX - childrenWidth / 2;

    for (const childId of childIds) {
      const childWidth = measure(childId);
      placeBranch(childId, childCursor, depth + 1, visited);
      childCursor += childWidth + groupGap;
    }
  }

  const rootBranches = [rootGroupId, ...[...siblingRootGroups].filter((id) => id !== rootGroupId)];
  const orderedBranches = rootBranches.filter((id, index) => rootBranches.indexOf(id) === index);
  const visited = new Set<string>();
  const rootWidths = orderedBranches.map((id) => measure(id));
  const rootTotalWidth = rootWidths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, orderedBranches.length - 1) * (groupGap * 1.35);
  let rootCursor = -rootTotalWidth / 2;

  for (let index = 0; index < orderedBranches.length; index += 1) {
    const branchId = orderedBranches[index];
    const width = rootWidths[index];
    if (!branchId || width === undefined) continue;
    placeBranch(branchId, rootCursor, 0, visited);
    rootCursor += width + groupGap * 1.35;
  }

  // Include any disconnected or otherwise unclassified components without
  // dropping people from the graph. They are placed as additional root-level
  // branches after the selected head and the head's directly linked siblings.
  const remaining = [...membersByGroup.keys()]
    .filter((id) => !visited.has(id))
    .sort((a, b) => {
      const aId = Math.min(...(membersByGroup.get(a) ?? []).map((n) => n.data.personId));
      const bId = Math.min(...(membersByGroup.get(b) ?? []).map((n) => n.data.personId));
      return aId - bId;
    });

  let extraLeft = rootCursor + groupGap;
  for (const groupId of remaining) {
    if (visited.has(groupId)) continue;
    const width = measure(groupId);
    placeBranch(groupId, extraLeft, 0, visited);
    extraLeft += width + groupGap;
  }

  return positions;
}

// --------------------------------------------------
// Build graph edges
// --------------------------------------------------

function createGraphEdges(
  nodes: TreeNode[],
  edges: TreeEdge[],
): Array<{
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    isMarriage: boolean;
  };
  classes: string;
}> {
  const nodeById = new Map(nodes.map((node) => [node.data.id, node.data]));

  const uniqueEdges = new Map<
    string,
    {
      source: string;
      target: string;
      label: string;
      kind: RelationshipKind;
    }
  >();

  for (const edge of edges) {
    const { source, target } = edge.data;

    if (!nodeById.has(source) || !nodeById.has(target)) {
      continue;
    }

    if (source === target) {
      continue;
    }

    const kind = getRelationshipKind(edge.data);

    let graphSource = source;
    let graphTarget = target;
    let key: string;
    let label: string;

    if (kind === "parent-child") {
      const relationship = getParentChildIds(edge.data);

      if (!relationship) continue;

      graphSource = relationship.parentId;
      graphTarget = relationship.childId;

      const parent = nodeById.get(graphSource);
      const child = nodeById.get(graphTarget);

      if (!parent || !child) continue;

      label = `${getParentLabel(parent.gender)} → ${getChildLabel(child.gender)}`;

      key = `parent:${graphSource}:${graphTarget}`;
    } else {
      const sortedIds = [source, target].sort();

      graphSource = sortedIds[0] ?? source;
      graphTarget = sortedIds[1] ?? target;

      if (kind === "marriage") {
        label = "Spouse";
        key = `marriage:${graphSource}:${graphTarget}`;
      } else if (kind === "sibling") {
        label = "Sibling";
        key = `sibling:${graphSource}:${graphTarget}`;
      } else {
        label = edge.data.label || edge.data.relationType || "Relationship";

        key = `other:${graphSource}:${graphTarget}:${normalizeRelation(
          edge.data.relationType,
        )}`;
      }
    }

    if (!uniqueEdges.has(key)) {
      uniqueEdges.set(key, {
        source: graphSource,
        target: graphTarget,
        label,
        kind,
      });
    }
  }

  return [...uniqueEdges.values()].map((edge, index) => ({
    data: {
      id: `family-relationship-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      isMarriage: edge.kind === "marriage",
    },
    classes:
      edge.kind === "marriage"
        ? "marriage"
        : edge.kind === "parent-child"
          ? "parent-child"
          : edge.kind === "sibling"
            ? "sibling"
            : "relationship",
  }));
}

// --------------------------------------------------
// Family Tree Graph Component
// --------------------------------------------------

export function FamilyTreeGraph({
  nodes,
  edges,
  rootId,
  selectedId,
  onSelect,
}: FamilyTreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<CyInstance | null>(null);

  const [ready, setReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const nodePositions = useMemo(
    () => calculateNodePositions(nodes, edges, rootId),
    [nodes, edges, rootId],
  );

  const graphElements = useMemo(() => {
    const graphNodes = nodes.map((node) => {
      const isFemale = node.data.gender.trim().toLowerCase() === "female";

      const classes = [
        isFemale ? "female" : "male",
        node.data.isFamilyHead ? "family-head" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const initials = getInitials(node.data.fullName);
      const gender = getGenderLabel(node.data.gender);
      const dob = formatDate(node.data.dob);

      const native = node.data.originalNative?.trim()
        ? `Native: ${node.data.originalNative.trim()}`
        : "Native: Not available";

      return {
        data: {
          ...node.data,
          initials,
          displayLabel: [
            initials,
            node.data.fullName,
            gender,
            `DOB: ${dob.replace("DOB ", "")}`,
            native,
          ].join("\n"),
        },
        position: nodePositions.get(node.data.id) ?? {
          x: 0,
          y: 0,
        },
        classes,
      };
    });

    const graphEdges = createGraphEdges(nodes, edges);

    return [...graphNodes, ...graphEdges];
  }, [nodes, edges, nodePositions]);

  // Initialize Cytoscape.
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let cyInstance: CyInstance | null = null;

    async function createGraph() {
      const graphContainer = containerRef.current;

      if (!graphContainer || cancelled) {
        return;
      }

      try {
        const cytoscape = (await import("cytoscape")).default;

        if (cancelled || !containerRef.current) {
          return;
        }

        const css = getComputedStyle(document.documentElement);

        const getToken = (name: string, fallback: string) =>
          css.getPropertyValue(name).trim() || fallback;

        const textColor = getToken("--foreground", "#26352D");

        const mutedColor = getToken("--muted-foreground", "#68766E");

        const cardColor = getToken("--card", "#FFFFFF");

        const borderColor = getToken("--border", "#D6DED8");

        const cy = cytoscape({
          container: graphContainer,
          elements: graphElements,

          style: [
            {
              selector: "node",
              style: {
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                shape: "round-rectangle",
                "background-color": MALE_FILL,
                "border-width": 1.5,
                "border-color": borderColor,
                label: "data(displayLabel)",
                color: textColor,
                "font-size": 10,
                "font-weight": 600,
                "font-family": "Manrope, sans-serif",
                "text-valign": "center",
                "text-halign": "center",
                "text-wrap": "wrap",
                "text-max-width": NODE_WIDTH - 18,
                "text-outline-width": 0,
                "line-height": 1.4,
              },
            },

            {
              selector: "node.female",
              style: {
                "background-color": FEMALE_FILL,
              },
            },

            {
              selector: "node.male",
              style: {
                "background-color": MALE_FILL,
              },
            },

            {
              selector: "node.family-head",
              style: {
                width: HEAD_NODE_WIDTH,
                height: HEAD_NODE_HEIGHT,
                "border-width": 4,
                "border-color": HEAD_BORDER,
                "font-weight": 800,
              },
            },

            {
              selector: "node:selected",
              style: {
                "border-width": 4,
                "border-color": SELECTED_BORDER,
                "overlay-color": SELECTED_BORDER,
                "overlay-opacity": 0.12,
                "overlay-padding": 8,
              },
            },

            {
              selector: "edge",
              style: {
                width: 2,
                "line-color": "#91A99A",
                "curve-style": "taxi",
                "taxi-direction": "vertical",
                "taxi-turn": 28,
                "target-arrow-shape": "none",
                "source-arrow-shape": "none",
                label: "data(label)",
                "font-size": 9,
                "font-family": "Manrope, sans-serif",
                color: mutedColor,
                "text-background-color": cardColor,
                "text-background-opacity": 0.95,
                "text-background-padding": 3,
                "text-rotation": "autorotate",
              },
            },

            {
              selector: "edge.parent-child",
              style: {
                width: 2.5,
                "line-color": "#7D9D88",
                "target-arrow-shape": "triangle",
                "target-arrow-color": "#7D9D88",
                "arrow-scale": 0.9,
              },
            },

            {
              selector: "edge.marriage",
              style: {
                "line-style": "dashed",
                width: 2.5,
                "line-color": "#B58D80",
                "target-arrow-shape": "none",
              },
            },

            {
              selector: "edge.sibling",
              style: {
                width: 1.5,
                "line-style": "dotted",
                "line-color": "#A6B5AC",
                "target-arrow-shape": "none",
              },
            },
          ],

          layout: {
            name: "preset",
            fit: false,
          },

          wheelSensitivity: 0.18,
          minZoom: 0.15,
          maxZoom: 2.5,
        } as never) as unknown as CyInstance;

        if (cancelled) {
          cy.destroy();
          return;
        }

        cyInstance = cy;
        cyRef.current = cy;

        cy.on("tap", "node", (event) => {
          const id = event.target.id();

          const selectedNode = nodes.find((node) => node.data.id === id);

          if (selectedNode) {
            onSelect?.(selectedNode.data);
          }
        });

        cy.fit(undefined, 65);

        observer = new ResizeObserver(() => {
          cy.resize();
        });

        observer.observe(graphContainer);

        setReady(true);
      } catch (error) {
        if (!cancelled) {
          console.error("Family tree initialization failed:", error);

          setReady(false);
        }
      }
    }

    void createGraph();

    return () => {
      cancelled = true;

      observer?.disconnect();
      cyInstance?.destroy();

      if (cyRef.current === cyInstance) {
        cyRef.current = null;
      }

      setReady(false);
    };
  }, [graphElements, nodes, onSelect]);

  // Highlight selected person.
  useEffect(() => {
    const cy = cyRef.current;

    if (!cy || !ready) {
      return;
    }

    cy.nodes().unselect();

    if (selectedId) {
      cy.getElementById(selectedId).select();
    }
  }, [selectedId, ready]);

  // Resize graph when fullscreen changes.
  useEffect(() => {
    const cy = cyRef.current;

    if (!cy || !ready) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      cy.resize();
      cy.fit(undefined, 65);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [fullscreen, ready]);

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-background p-4"
          : "relative"
      }
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div
          ref={containerRef}
          className={`vv-canvas w-full ${
            fullscreen ? "h-[calc(100vh-8rem)]" : "h-[560px] sm:h-[680px]"
          }`}
          role="img"
          aria-label="Interactive family tree arranged by generations. The selected family head is the root. Spouses are grouped with their partners, descendants are arranged beneath their parent couple, and the head's siblings appear as separate branches at the root generation."
        />

        {!ready && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-card/80"
            aria-hidden="true"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-44 animate-pulse rounded-xl bg-muted" />
              <div className="h-12 w-56 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        )}

        {/* Graph controls */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          <Button
            size="icon"
            variant="outline"
            className="size-9 bg-card"
            aria-label="Zoom in"
            onClick={() => {
              const cy = cyRef.current;

              if (cy) {
                cy.zoom(cy.getZoom() * 1.2);
              }
            }}
          >
            <Plus className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="outline"
            className="size-9 bg-card"
            aria-label="Zoom out"
            onClick={() => {
              const cy = cyRef.current;

              if (cy) {
                cy.zoom(cy.getZoom() / 1.2);
              }
            }}
          >
            <Minus className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="outline"
            className="size-9 bg-card"
            aria-label="Fit family tree"
            onClick={() => cyRef.current?.fit(undefined, 65)}
          >
            <Maximize2 className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="outline"
            className="size-9 bg-card"
            aria-label="Center family tree"
            onClick={() => cyRef.current?.center()}
          >
            <Crosshair className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="outline"
            className="size-9 bg-card"
            aria-label={fullscreen ? "Exit fullscreen" : "Open fullscreen"}
            onClick={() => setFullscreen((value) => !value)}
          >
            {fullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-full border border-border bg-card/95 px-3 py-2 text-[11px] font-semibold text-muted-foreground shadow-sm">
          <span className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-md"
              style={{ background: MALE_FILL }}
            />
            Male
          </span>

          <span className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-md"
              style={{ background: FEMALE_FILL }}
            />
            Female
          </span>

          <span className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-md border-[3px]"
              style={{
                background: MALE_FILL,
                borderColor: HEAD_BORDER,
              }}
            />
            Family head
          </span>

          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 bg-[#7D9D88]" />
            Parent / Child
          </span>

          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 border-t-2 border-dashed border-[#B58D80]" />
            Spouse (below partner)
          </span>

          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-md border border-dashed border-[#A6B5AC]" />
            Head's sibling branch
          </span>
        </div>
      </div>

      {/* Fullscreen footer */}
      {fullscreen && (
        <div className="flex items-center justify-between gap-3 py-3">
          <p className="text-xs text-muted-foreground">
            Scroll to zoom · Drag to pan · Select a member to view details
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreen(false)}
          >
            <Minimize2 className="mr-2 size-4" />
            Exit fullscreen
          </Button>
        </div>
      )}
    </div>
  );
}
