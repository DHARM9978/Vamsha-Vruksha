const db = require("../config/db");

const MARRIAGE_RELATIONS = new Set([
  "husband-wife",
  "wife-husband",
  "spouse",
  "married",
]);

const PARENT_RELATIONS = new Set([
  "father",
  "mother",
  "son",
  "daughter",
  "parent",
  "child",
]);

const SIBLING_RELATIONS = new Set([
  "brother",
  "sister",
  "sibling",
]);

const RELATION_BATCH_SIZE = 200;
const PERSON_BATCH_SIZE = 500;
const DEFAULT_MAX_DEPTH = 4;
const DEFAULT_MAX_NODES = 2000;
const HARD_MAX_NODES = 10000;

const createError = (
  message,
  statusCode = 400,
  code = "FAMILY_TREE_ERROR"
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const positiveId = (value, label) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(
      `${label} must be a valid positive integer`,
      400,
      "INVALID_ID"
    );
  }

  return id;
};

const parseBoundedInteger = (
  value,
  fallback,
  min,
  max,
  label
) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const text = String(value).trim();

  if (!/^\d+$/.test(text)) {
    throw createError(
      `${label} must be a whole number between ${min} and ${max}`,
      400,
      "INVALID_TREE_LIMIT"
    );
  }

  const parsed = Number(text);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < min ||
    parsed > max
  ) {
    throw createError(
      `${label} must be a whole number between ${min} and ${max}`,
      400,
      "INVALID_TREE_LIMIT"
    );
  }

  return parsed;
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const uniquePositiveIds = (values) =>
  [...new Set(
    (Array.isArray(values) ? values : [])
      .map(Number)
      .filter((id) => Number.isSafeInteger(id) && id > 0)
  )];

const chunks = (values, size) => {
  const result = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
};

const placeholders = (count) =>
  Array.from({ length: count }, () => "?").join(",");

const personName = (person) =>
  [person.First_Name, person.Last_Name]
    .filter(Boolean)
    .join(" ")
    .trim() || `Person ${person.Person_Id}`;

const classify = (relationType) => {
  const relation = normalize(relationType);

  if (MARRIAGE_RELATIONS.has(relation)) {
    return { kind: "marriage" };
  }

  if (SIBLING_RELATIONS.has(relation)) {
    return { kind: "sibling" };
  }

  if (PARENT_RELATIONS.has(relation)) {
    return { kind: "parent-child" };
  }

  return { kind: "other" };
};

const getParentChildIds = (edge) => {
  const relation = normalize(edge.Relation_Type);
  const sourceId = Number(edge.Person_Id);
  const targetId = Number(edge.Related_Person_Id);

  // Canonical convention from relation.service.js:
  // Father/Mother: source person is the parent.
  // Son/Daughter: source person is the child.
  // The reverse relationship row carries the corresponding reverse label.
  if (relation === "father" || relation === "mother") {
    return {
      parentId: sourceId,
      childId: targetId,
    };
  }

  if (relation === "son" || relation === "daughter") {
    return {
      parentId: targetId,
      childId: sourceId,
    };
  }

  if (relation === "parent") {
    return {
      parentId: sourceId,
      childId: targetId,
    };
  }

  if (relation === "child") {
    return {
      parentId: targetId,
      childId: sourceId,
    };
  }

  return null;
};

const toNode = (person, headId, bloodlineIds) => {
  const id = Number(person.Person_Id);

  return {
    data: {
      id: String(id),
      personId: id,
      familyId: Number(person.Family_Id),
      firstName: person.First_Name || "",
      lastName: person.Last_Name || "",
      fullName: personName(person),
      gender: person.Gender || "",
      dob: person.DOB || null,
      originalNative: person.Original_Native || null,
      isSelectedFamilyMember: bloodlineIds.has(id),
      isFamilyHead: id === headId,
    },
  };
};

const validateAccessContext = (accessContext, familyId) => {
  if (!accessContext || typeof accessContext !== "object") {
    throw createError(
      "Family access context is missing. Ensure loadFamilyAccess runs before the tree controller.",
      500,
      "FAMILY_ACCESS_CONTEXT_MISSING"
    );
  }

  if (accessContext.role === "Admin" && accessContext.isGlobal === true) {
    return {
      isGlobal: true,
      bloodlinePersonIds: null,
      spousePersonIds: null,
    };
  }

  if (accessContext.role !== "User" || accessContext.isGlobal === true) {
    throw createError(
      "A valid family access context is required.",
      403,
      "INVALID_FAMILY_ACCESS_CONTEXT"
    );
  }

  const permittedBloodlineFamilies = uniquePositiveIds(
    accessContext.bloodlineFamilyIds
  );

  if (!permittedBloodlineFamilies.includes(familyId)) {
    // Do not reveal whether a non-permitted family exists.
    throw createError("Family tree not found", 404, "FAMILY_TREE_NOT_FOUND");
  }

  return {
    isGlobal: false,
    bloodlinePersonIds: new Set(
      uniquePositiveIds(accessContext.bloodlinePersonIds)
    ),
    spousePersonIds: new Set(
      uniquePositiveIds(accessContext.spousePersonIds)
    ),
  };
};

const fetchRelationships = async (personIds) => {
  const rowsById = new Map();

  for (const batch of chunks(personIds, RELATION_BATCH_SIZE)) {
    if (batch.length === 0) continue;

    const marks = placeholders(batch.length);

    const [rows] = await db.execute(
      `SELECT
         Relation_Id,
         Person_Id,
         Related_Person_Id,
         Relation_Type
       FROM family_relation
       WHERE Person_Id IN (${marks})
          OR Related_Person_Id IN (${marks})
       ORDER BY Relation_Id ASC`,
      [...batch, ...batch]
    );

    for (const row of rows) {
      rowsById.set(Number(row.Relation_Id), row);
    }
  }

  return [...rowsById.values()];
};

const fetchPeopleByIds = async (personIds) => {
  const peopleById = new Map();

  for (const batch of chunks(personIds, PERSON_BATCH_SIZE)) {
    if (batch.length === 0) continue;

    const [rows] = await db.execute(
      `SELECT
         Person_Id,
         Family_Id,
         First_Name,
         Last_Name,
         Gender,
         DOB,
         Original_Native,
         Gotra_Id
       FROM person
       WHERE Person_Id IN (${placeholders(batch.length)})`,
      batch
    );

    for (const person of rows) {
      peopleById.set(Number(person.Person_Id), person);
    }
  }

  return peopleById;
};

const makeEdge = (row, kind, parentChild = null) => ({
  data: {
    id: `relation-${Number(row.Relation_Id)}`,
    source: String(Number(row.Person_Id)),
    target: String(Number(row.Related_Person_Id)),
    relationType: String(row.Relation_Type || "").trim(),
    label:
      String(row.Relation_Type || "").trim() ||
      (kind === "marriage"
        ? "Spouse"
        : kind === "sibling"
          ? "Sibling"
          : "Parent/Child"),
    isMarriage: kind === "marriage",
    kind,
    ...(parentChild
      ? {
          parentId: String(parentChild.parentId),
          childId: String(parentChild.childId),
        }
      : {}),
  },
});

const getEmptyTree = (family, maxDepth, familyMembers = 0, truncated = false) => ({
  family,
  headPerson: null,
  nodes: [],
  edges: [],
  meta: {
    totalNodes: 0,
    totalEdges: 0,
    familyMembers,
    connectedMembers: 0,
    spouseCount: 0,
    maxDepth,
    truncated,
  },
});

async function getFamilyTree(familyId, options = {}) {
  const validFamilyId = positiveId(familyId, "Family ID");

  const maxDepth = parseBoundedInteger(
    options.maxDepth,
    DEFAULT_MAX_DEPTH,
    1,
    100,
    "maxDepth"
  );

  const maxNodes = parseBoundedInteger(
    options.maxNodes,
    DEFAULT_MAX_NODES,
    1,
    HARD_MAX_NODES,
    "maxNodes"
  );

  const access = validateAccessContext(
    options.accessContext,
    validFamilyId
  );

  const [familyRows] = await db.execute(
    `SELECT
       f.Family_Id,
       f.Family_Name,
       f.Reference_Id,
       f.Native_Place,
       f.Gotra_Id
     FROM family f
     WHERE f.Family_Id = ?
     LIMIT 1`,
    [validFamilyId]
  );

  if (familyRows.length === 0) {
    throw createError("Family tree not found", 404, "FAMILY_TREE_NOT_FOUND");
  }

  const family = familyRows[0];

  // Select only the non-confidential fields required by the graph.
  const [allFamilyMembers] = await db.execute(
    `SELECT
       p.Person_Id,
       p.Family_Id,
       p.First_Name,
       p.Last_Name,
       p.Gender,
       p.DOB,
       p.Original_Native,
       p.Gotra_Id
     FROM person p
     WHERE p.Family_Id = ?
     ORDER BY p.Person_Id ASC`,
    [validFamilyId]
  );

  // For ordinary Users, familyAccess.service has already calculated the
  // permitted bloodline. Use that complete authorized set as the graph's
  // membership boundary. Do not shrink it based only on links reachable
  // downward from the selected person.
  const authorizedMembers = access.isGlobal
    ? allFamilyMembers
    : allFamilyMembers.filter((person) =>
        access.bloodlinePersonIds.has(Number(person.Person_Id))
      );

  if (authorizedMembers.length === 0) {
    return getEmptyTree(family, maxDepth, 0, false);
  }

  const authorizedPeopleById = new Map(
    authorizedMembers.map((person) => [
      Number(person.Person_Id),
      person,
    ])
  );

  const requestedHeadId =
    options.headPersonId === undefined ||
    options.headPersonId === null ||
    options.headPersonId === ""
      ? null
      : positiveId(options.headPersonId, "Head person ID");

  let head = null;

  if (requestedHeadId !== null) {
    head = authorizedPeopleById.get(requestedHeadId) || null;

    if (!head) {
      throw createError(
        "Selected Family Head is not part of this authorized family tree.",
        404,
        "TREE_HEAD_NOT_FOUND"
      );
    }
  } else if (
    !access.isGlobal &&
    options.accessContext.anchorPersonId
  ) {
    head =
      authorizedPeopleById.get(
        Number(options.accessContext.anchorPersonId)
      ) || null;
  }

  head = head || authorizedMembers[0];

  const headId = Number(head.Person_Id);

  // Keep the selected person first. Apply maxNodes to the authorized
  // bloodline node set, then use any remaining capacity for spouse nodes.
  const orderedBloodlineMembers = [
    head,
    ...authorizedMembers.filter(
      (person) => Number(person.Person_Id) !== headId
    ),
  ];

  const bloodlineMembers = orderedBloodlineMembers.slice(0, maxNodes);
  let truncated = bloodlineMembers.length < authorizedMembers.length;

  const bloodlineIds = new Set(
    bloodlineMembers.map((person) => Number(person.Person_Id))
  );

  const bloodlineRelations = await fetchRelationships([
    ...bloodlineIds,
  ]);

  const parentChildEdgeRows = new Map();
  const siblingEdgeRows = new Map();
  const spouseEdgeRows = new Map();
  const spouseIds = new Set();

  const parentsByChild = new Map();
  const childrenByParent = new Map();
  const siblingsByPerson = new Map();

  const addToAdjacency = (map, key, value) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(value);
  };

  // First normalize every authorized bloodline edge. Reciprocal
  // parent/child and sibling rows are deduplicated for graph layout.
  for (const row of bloodlineRelations) {
    const sourceId = Number(row.Person_Id);
    const targetId = Number(row.Related_Person_Id);

    if (
      !Number.isSafeInteger(sourceId) ||
      sourceId <= 0 ||
      !Number.isSafeInteger(targetId) ||
      targetId <= 0 ||
      sourceId === targetId
    ) {
      continue;
    }

    const relationKind = classify(row.Relation_Type).kind;

    if (
      relationKind === "parent-child" &&
      bloodlineIds.has(sourceId) &&
      bloodlineIds.has(targetId)
    ) {
      const parentChild = getParentChildIds(row);
      if (!parentChild) continue;

      const { parentId, childId } = parentChild;
      const edgeKey = `${parentId}:${childId}`;

      if (!parentChildEdgeRows.has(edgeKey)) {
        parentChildEdgeRows.set(edgeKey, {
          row,
          parentChild,
        });
      }

      addToAdjacency(childrenByParent, parentId, childId);
      addToAdjacency(parentsByChild, childId, parentId);
      continue;
    }

    if (
      relationKind === "sibling" &&
      bloodlineIds.has(sourceId) &&
      bloodlineIds.has(targetId)
    ) {
      const pairKey = [sourceId, targetId]
        .sort((a, b) => a - b)
        .join(":");

      if (!siblingEdgeRows.has(pairKey)) {
        siblingEdgeRows.set(pairKey, row);
      }

      addToAdjacency(siblingsByPerson, sourceId, targetId);
      addToAdjacency(siblingsByPerson, targetId, sourceId);
    }
  }

  // Walk upward from the selected person to collect all known ancestors.
  // This is the step missing from the previous implementation.
  const ancestorIds = new Set([headId]);
  const ancestorDepth = new Map([[headId, 0]]);
  const ancestorQueue = [{ personId: headId, depth: 0 }];

  while (ancestorQueue.length > 0) {
    const current = ancestorQueue.shift();
    const parents = parentsByChild.get(current.personId) || new Set();

    for (const parentId of parents) {
      if (current.depth >= maxDepth) {
        truncated = true;
        continue;
      }

      const nextDepth = current.depth + 1;
      const previousDepth = ancestorDepth.get(parentId);

      if (
        previousDepth !== undefined &&
        previousDepth <= nextDepth
      ) {
        continue;
      }

      if (
        !ancestorIds.has(parentId) &&
        ancestorIds.size >= maxNodes
      ) {
        truncated = true;
        continue;
      }

      ancestorIds.add(parentId);
      ancestorDepth.set(parentId, nextDepth);
      ancestorQueue.push({
        personId: parentId,
        depth: nextDepth,
      });
    }
  }

  // Start the full descendant traversal from the oldest ancestors found.
  // Descending from these roots includes the selected person's siblings
  // and the other branches of the same bloodline.
  const topAncestorIds = [...ancestorIds].filter((personId) => {
    const parents = parentsByChild.get(personId) || new Set();

    return ![...parents].some((parentId) =>
      ancestorIds.has(parentId)
    );
  });

  const includedBloodlineIds = new Set(ancestorIds);
  const generationDepth = new Map();

  for (const rootId of topAncestorIds) {
    generationDepth.set(rootId, 0);
  }

  const descendantQueue = topAncestorIds.map((personId) => ({
    personId,
    depth: 0,
  }));

  while (descendantQueue.length > 0) {
    const current = descendantQueue.shift();

    // Explicit sibling rows place siblings in the same generation.
    // Shared-parent siblings are also discovered naturally because
    // every child of each ancestor is traversed below.
    const siblings = siblingsByPerson.get(current.personId) || new Set();

    for (const siblingId of siblings) {
      if (includedBloodlineIds.has(siblingId)) {
        const knownDepth = generationDepth.get(siblingId);

        if (knownDepth === undefined || current.depth < knownDepth) {
          generationDepth.set(siblingId, current.depth);
          descendantQueue.push({
            personId: siblingId,
            depth: current.depth,
          });
        }

        continue;
      }

      if (current.depth > maxDepth) {
        truncated = true;
        continue;
      }

      if (includedBloodlineIds.size >= maxNodes) {
        truncated = true;
        continue;
      }

      includedBloodlineIds.add(siblingId);
      generationDepth.set(siblingId, current.depth);
      descendantQueue.push({
        personId: siblingId,
        depth: current.depth,
      });
    }

    const children = childrenByParent.get(current.personId) || new Set();

    for (const childId of children) {
      const childDepth = current.depth + 1;

      if (childDepth > maxDepth) {
        truncated = true;
        continue;
      }

      const knownDepth = generationDepth.get(childId);

      if (knownDepth !== undefined && knownDepth <= childDepth) {
        continue;
      }

      if (
        !includedBloodlineIds.has(childId) &&
        includedBloodlineIds.size >= maxNodes
      ) {
        truncated = true;
        continue;
      }

      includedBloodlineIds.add(childId);
      generationDepth.set(childId, childDepth);
      descendantQueue.push({
        personId: childId,
        depth: childDepth,
      });
    }
  }

  // Any authorized bloodline person not reachable within the requested
  // depth is intentionally omitted and marks the graph as truncated.
  if (includedBloodlineIds.size < bloodlineIds.size) {
    truncated = true;
  }

  // Spouses are collected only for included bloodline members.
  // Their own parents, siblings and descendants are never traversed.
  for (const row of bloodlineRelations) {
    if (classify(row.Relation_Type).kind !== "marriage") {
      continue;
    }

    const sourceId = Number(row.Person_Id);
    const targetId = Number(row.Related_Person_Id);
    const sourceIsBloodline = includedBloodlineIds.has(sourceId);
    const targetIsBloodline = includedBloodlineIds.has(targetId);

    if (!sourceIsBloodline && !targetIsBloodline) {
      continue;
    }

    if (sourceIsBloodline && targetIsBloodline) {
      const pairKey = [sourceId, targetId]
        .sort((a, b) => a - b)
        .join(":");

      if (!spouseEdgeRows.has(pairKey)) {
        spouseEdgeRows.set(pairKey, row);
      }

      continue;
    }

    const spouseId = sourceIsBloodline ? targetId : sourceId;

    if (
      !access.isGlobal &&
      !access.spousePersonIds.has(spouseId)
    ) {
      continue;
    }

    const pairKey = [sourceId, targetId]
      .sort((a, b) => a - b)
      .join(":");

    if (!spouseEdgeRows.has(pairKey)) {
      spouseEdgeRows.set(pairKey, row);
    }

    spouseIds.add(spouseId);
  }

  // Retain only edges whose bloodline endpoints survived the depth and
  // node limits. No spouse-side family members are added.
  for (const [key, item] of [...parentChildEdgeRows.entries()]) {
    if (
      !includedBloodlineIds.has(item.parentChild.parentId) ||
      !includedBloodlineIds.has(item.parentChild.childId)
    ) {
      parentChildEdgeRows.delete(key);
    }
  }

  for (const [key, row] of [...siblingEdgeRows.entries()]) {
    if (
      !includedBloodlineIds.has(Number(row.Person_Id)) ||
      !includedBloodlineIds.has(Number(row.Related_Person_Id))
    ) {
      siblingEdgeRows.delete(key);
    }
  }

  // Reserve maxNodes capacity for bloodline members first.
  const remainingNodeCapacity = Math.max(
    0,
    maxNodes - includedBloodlineIds.size
  );

  const allSpouseIds = [...spouseIds].sort((a, b) => a - b);
  const includedSpouseIds = new Set(
    allSpouseIds.slice(0, remainingNodeCapacity)
  );

  if (includedSpouseIds.size < allSpouseIds.length) {
    truncated = true;
  }

  for (const [key, row] of [...spouseEdgeRows.entries()]) {
    const sourceId = Number(row.Person_Id);
    const targetId = Number(row.Related_Person_Id);

    const sourceAllowed =
      includedBloodlineIds.has(sourceId) ||
      includedSpouseIds.has(sourceId);

    const targetAllowed =
      includedBloodlineIds.has(targetId) ||
      includedSpouseIds.has(targetId);

    if (!sourceAllowed || !targetAllowed) {
      spouseEdgeRows.delete(key);
    }
  }

  const spousePeopleById = await fetchPeopleByIds([
    ...includedSpouseIds,
  ]);

  const nodes = [];

  const includedBloodlineMembers = [...includedBloodlineIds]
    .map((personId) => authorizedPeopleById.get(personId))
    .filter(Boolean);

  for (const person of includedBloodlineMembers) {
    nodes.push(toNode(person, headId, includedBloodlineIds));
  }

  for (const spouseId of includedSpouseIds) {
    const spouse = spousePeopleById.get(spouseId);

    if (spouse && !includedBloodlineIds.has(spouseId)) {
      nodes.push(toNode(spouse, headId, includedBloodlineIds));
    }
  }

  const nodeIds = new Set(
    nodes.map((node) => node.data.id)
  );

  const edges = [];
  const includedEdgeKeys = new Set();

  const addEdgeOnce = (edge, key) => {
    if (includedEdgeKeys.has(key)) return;

    if (
      !nodeIds.has(edge.data.source) ||
      !nodeIds.has(edge.data.target)
    ) {
      return;
    }

    includedEdgeKeys.add(key);
    edges.push(edge);
  };

  for (const [pairKey, row] of siblingEdgeRows.entries()) {
    addEdgeOnce(
      makeEdge(row, "sibling"),
      `sibling:${pairKey}`
    );
  }

  for (const [relationshipKey, item] of parentChildEdgeRows.entries()) {
    addEdgeOnce(
      makeEdge(item.row, "parent-child", item.parentChild),
      `parent-child:${relationshipKey}`
    );
  }

  for (const [pairKey, row] of spouseEdgeRows.entries()) {
    addEdgeOnce(
      makeEdge(row, "marriage"),
      `marriage:${pairKey}`
    );
  }

  return {
    family,

    headPerson: {
      personId: headId,
      fullName: personName(head),
      gender: head.Gender || "",
      dob: head.DOB || null,
    },

    nodes,
    edges,

    meta: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      familyMembers: authorizedMembers.length,
      connectedMembers: Math.max(0, includedBloodlineIds.size - 1),
      spouseCount: includedSpouseIds.size,
      maxDepth,
      truncated,
    },
  };
}

module.exports = {
  getFamilyTree,
};