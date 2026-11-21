
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

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const positiveId = (value, label) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(
      `${label} must be a valid positive integer`
    );
  }

  return id;
};

const limit = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, min), max)
    : fallback;
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const personName = (person) =>
  [
    person.First_Name,
    person.Last_Name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || `Person ${person.Person_Id}`;

function classify(relationType, sourceId, targetId) {
  const relation = normalize(relationType);

  if (MARRIAGE_RELATIONS.has(relation)) {
    return {
      kind: "marriage",
      relationType,
    };
  }

  if (SIBLING_RELATIONS.has(relation)) {
    return {
      kind: "sibling",
      relationType,
    };
  }

  if (PARENT_RELATIONS.has(relation)) {
    // Database convention:
    // Father/Mother: child -> parent
    // Son/Daughter: parent -> child

    if (
      relation === "father" ||
      relation === "mother"
    ) {
      return {
        kind: "parent-child",
        parentId: targetId,
        childId: sourceId,
        relationType,
      };
    }

    if (
      relation === "son" ||
      relation === "daughter"
    ) {
      return {
        kind: "parent-child",
        parentId: sourceId,
        childId: targetId,
        relationType,
      };
    }

    if (relation === "parent") {
      return {
        kind: "parent-child",
        parentId: sourceId,
        childId: targetId,
        relationType,
      };
    }

    if (relation === "child") {
      return {
        kind: "parent-child",
        parentId: targetId,
        childId: sourceId,
        relationType,
      };
    }
  }

  return {
    kind: "other",
    relationType,
  };
}

function toNode(person, headId, bloodlineIds) {
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
}

async function getFamilyTree(familyId, options = {}) {
  const validFamilyId = positiveId(
    familyId,
    "Family ID"
  );

  const maxDepth = limit(
    options.maxDepth,
    100,
    1,
    100
  );

  const maxNodes = limit(
    options.maxNodes,
    2000,
    1,
    10000
  );

  const [families] = await db.execute(
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

  if (!families.length) {
    throw createError("Family not found", 404);
  }

  const family = families[0];

  const [members] = await db.execute(
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

  if (!members.length) {
    return {
      family,
      headPerson: null,
      nodes: [],
      edges: [],
      meta: {
        totalNodes: 0,
        totalEdges: 0,
        familyMembers: 0,
        connectedMembers: 0,
        spouseCount: 0,
        maxDepth,
        truncated: false,
      },
    };
  }

  const requestedHeadId = options.headPersonId
    ? positiveId(
        options.headPersonId,
        "Head person ID"
      )
    : null;

  const head = requestedHeadId
    ? members.find(
        (person) =>
          Number(person.Person_Id) === requestedHeadId
      )
    : members[0];

  if (requestedHeadId && !head) {
    throw createError(
      "Selected Family Head does not belong to this family",
      404
    );
  }

  const headId = Number(head.Person_Id);

  const familyPeople = new Map(
    members.map((person) => [
      Number(person.Person_Id),
      person,
    ])
  );

  // Selected Family Head is the displayed root.
  // Do not traverse above the selected head.
  // Include the head's siblings as parallel branches.

  const bloodlineIds = new Set([headId]);
  const spouseOnlyIds = new Set();
  const includedRelations = new Map();

  const queue = [
    {
      id: headId,
      depth: 0,
    },
  ];

  const queued = new Set([headId]);
  const processed = new Set();

  let truncated = false;

  while (queue.length) {
    const batch = queue.splice(0, 100);

    const ids = batch
      .map((item) => item.id)
      .filter((id) => !processed.has(id));

    if (!ids.length) continue;

    ids.forEach((id) => processed.add(id));

    const placeholders = ids
      .map(() => "?")
      .join(",");

    // Search relationships in both directions.
    const [rows] = await db.execute(
      `SELECT
          fr.Relation_Id,
          fr.Person_Id,
          fr.Related_Person_Id,
          fr.Relation_Type
       FROM family_relation fr
       WHERE
          fr.Person_Id IN (${placeholders})
          OR
          fr.Related_Person_Id IN (${placeholders})
       ORDER BY fr.Relation_Id ASC`,
      [...ids, ...ids]
    );

    for (const row of rows) {
      const sourceId = Number(row.Person_Id);
      const targetId = Number(row.Related_Person_Id);

      if (
        !sourceId ||
        !targetId ||
        sourceId === targetId
      ) {
        continue;
      }

      const relationType = String(
        row.Relation_Type || ""
      ).trim();

      const info = classify(
        relationType,
        sourceId,
        targetId
      );

      const edgeId =
        row.Relation_Id != null
          ? `relation-${row.Relation_Id}`
          : `relation-${sourceId}-${targetId}-${normalize(
              relationType
            )}`;

      const touchedIds = ids.filter(
        (id) =>
          id === sourceId || id === targetId
      );

      if (!touchedIds.length) continue;

      // -----------------------------------------
      // SPOUSE RELATIONSHIPS
      // -----------------------------------------

      if (info.kind === "marriage") {
        // Spouse is display-only.
        // Never queue the spouse for family traversal.

        const corePersonId = touchedIds.find(
          (id) => bloodlineIds.has(id)
        );

        if (corePersonId != null) {
          const spouseId =
            sourceId === corePersonId
              ? targetId
              : sourceId;

          if (!bloodlineIds.has(spouseId)) {
            spouseOnlyIds.add(spouseId);
          }

          includedRelations.set(edgeId, {
            data: {
              id: edgeId,
              source: String(sourceId),
              target: String(targetId),
              relationType,
              label: relationType || "Spouse",
              isMarriage: true,
              kind: "marriage",
            },
          });
        }

        continue;
      }

      // -----------------------------------------
      // SIBLING RELATIONSHIPS
      // -----------------------------------------

      if (info.kind === "sibling") {
        // Only the selected head's siblings are
        // discovered as parallel root branches.

        if (
          sourceId === headId ||
          targetId === headId
        ) {
          const siblingId =
            sourceId === headId
              ? targetId
              : sourceId;

          if (
            familyPeople.has(siblingId) &&
            !bloodlineIds.has(siblingId)
          ) {
            if (bloodlineIds.size >= maxNodes) {
              truncated = true;
              continue;
            }

            bloodlineIds.add(siblingId);

            if (!queued.has(siblingId)) {
              queued.add(siblingId);

              queue.push({
                id: siblingId,
                depth: 0,
              });
            }
          }

          if (
            familyPeople.has(sourceId) &&
            familyPeople.has(targetId)
          ) {
            includedRelations.set(edgeId, {
              data: {
                id: edgeId,
                source: String(sourceId),
                target: String(targetId),
                relationType,
                label: relationType || "Sibling",
                isMarriage: false,
                kind: "sibling",
              },
            });
          }
        } else if (
          bloodlineIds.has(sourceId) &&
          bloodlineIds.has(targetId)
        ) {
          includedRelations.set(edgeId, {
            data: {
              id: edgeId,
              source: String(sourceId),
              target: String(targetId),
              relationType,
              label: relationType || "Sibling",
              isMarriage: false,
              kind: "sibling",
            },
          });
        }

        continue;
      }

      // -----------------------------------------
      // PARENT-CHILD RELATIONSHIPS
      // -----------------------------------------

      if (info.kind === "parent-child") {
        const {
          parentId,
          childId,
        } = info;

        // Traverse downward only from included
        // bloodline members.

        if (
          bloodlineIds.has(parentId) &&
          familyPeople.has(childId) &&
          !bloodlineIds.has(childId)
        ) {
          const parentDepth =
            batch.find(
              (item) => item.id === parentId
            )?.depth ?? 0;

          const childDepth = parentDepth + 1;

          if (
            childDepth > maxDepth ||
            bloodlineIds.size >= maxNodes
          ) {
            truncated = true;
            continue;
          }

          bloodlineIds.add(childId);

          if (!queued.has(childId)) {
            queued.add(childId);

            queue.push({
              id: childId,
              depth: childDepth,
            });
          }
        }

        // Keep the relationship only when both
        // people belong to the bloodline.

        if (
          bloodlineIds.has(parentId) &&
          bloodlineIds.has(childId)
        ) {
          includedRelations.set(edgeId, {
            data: {
              id: edgeId,
              source: String(sourceId),
              target: String(targetId),
              relationType,
              label:
                relationType || "Parent/Child",
              isMarriage: false,
              kind: "parent-child",
              parentId: String(parentId),
              childId: String(childId),
            },
          });
        }

        continue;
      }

      // -----------------------------------------
      // OTHER RELATIONSHIPS
      // -----------------------------------------

      // Keep unknown relationships only when both
      // people are already included.
      // They cannot expand the hierarchy.

      if (
        familyPeople.has(sourceId) &&
        familyPeople.has(targetId) &&
        bloodlineIds.has(sourceId) &&
        bloodlineIds.has(targetId)
      ) {
        includedRelations.set(edgeId, {
          data: {
            id: edgeId,
            source: String(sourceId),
            target: String(targetId),
            relationType,
            label:
              relationType || "Relationship",
            isMarriage: false,
            kind: "other",
          },
        });
      }
    }
  }

  // -----------------------------------------
  // FETCH DISPLAY-ONLY SPOUSES
  // -----------------------------------------

  // A spouse may belong to another Family_Id.
  // Fetch them for display only.

  const spouseIds = [...spouseOnlyIds].filter(
    (id) => !familyPeople.has(id)
  );

  const [spouseRows] = spouseIds.length
    ? await db.execute(
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
         WHERE Person_Id IN (
           ${spouseIds.map(() => "?").join(",")}
         )`,
        spouseIds
      )
    : [[]];

  const allPeople = new Map(familyPeople);

  for (const person of spouseRows) {
    allPeople.set(
      Number(person.Person_Id),
      person
    );
  }

  const includedIds = new Set([
    ...bloodlineIds,
    ...spouseOnlyIds,
  ]);

  const nodes = [...includedIds]
    .map((id) => allPeople.get(id))
    .filter(Boolean)
    .map((person) =>
      toNode(person, headId, bloodlineIds)
    );

  const nodeIds = new Set(
    nodes.map((node) => node.data.id)
  );

  const edges = [...includedRelations.values()].filter(
    (edge) =>
      nodeIds.has(edge.data.source) &&
      nodeIds.has(edge.data.target)
  );

  return {
    family,

    headPerson: {
      personId: headId,
      fullName: personName(head),
      gender: head.Gender,
      dob: head.DOB,
    },

    nodes,
    edges,

    meta: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      familyMembers: members.length,
      connectedMembers: bloodlineIds.size - 1,
      spouseCount: spouseOnlyIds.size,
      maxDepth,
      truncated,
    },
  };
}

module.exports = {
  getFamilyTree,
};
