const db = require("../config/db");

const MAX_GENERATIONS = 20;
const MAX_DESCENDANTS = 2000;

// ======================================================
// COMMON HELPERS
// ======================================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePositiveId = (value, fieldName = "ID") => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(
      `${fieldName} must be a valid positive integer`,
      400
    );
  }

  return id;
};

// ======================================================
// PERSON QUERY
// ======================================================

const getPersonSelect = (includePrivate) => `
  SELECT
    p.Person_Id,
    p.Family_Id,
    p.First_Name,
    p.Last_Name,
    p.father_name,
    p.mother_name,
    p.Gender,
    p.DOB,
    ${includePrivate ? `
    p.Phone_Number,
    p.Mobile_Number,
    p.Email,
    p.Current_Address,` : ""}
    p.Original_Native,
    g.Gotra_Name,
    s.Sutra_Name,
    v.Vamsha_Name,
    kd.Kula_Devatha_Name,
    md.Mane_Devru_Name,
    ps.Panchang_Sudhi_Name,
    pv.Pooja_Vruksha_Name

  FROM person p

  LEFT JOIN gothra g
    ON g.Gotra_Id = p.Gotra_Id

  LEFT JOIN sutra s
    ON s.Sutra_Id = p.Sutra_Id

  LEFT JOIN vamsha v
    ON v.Vamsha_Id = p.Vamsha_Id

  LEFT JOIN kula_devatha kd
    ON kd.Kula_Devatha_Id = p.Kula_Devatha_Id

  LEFT JOIN mane_devru md
    ON md.Mane_Devru_Id = p.Mane_Devru_Id

  LEFT JOIN panchang_sudhi ps
    ON ps.Panchang_Sudhi_Id = p.Panchang_Sudhi_Id

  LEFT JOIN pooja_vruksha pv
    ON pv.Pooja_Vruksha_Id = p.Pooja_Vruksha_Id
`;

// ======================================================
// MAP PERSON DATA
// ======================================================

const getFullName = (person) =>
  [person.First_Name, person.Last_Name]
    .filter(Boolean)
    .join(" ")
    .trim() || `Person ${person.Person_Id}`;

const mapPerson = (person, includePrivate = true) => {
  if (!person) return null;

  const mapped = {
    personId: Number(person.Person_Id),
    familyId: Number(person.Family_Id),
    firstName: person.First_Name,
    lastName: person.Last_Name,
    fullName: getFullName(person),
    gender: person.Gender,
    dob: person.DOB,
    fatherName: person.father_name,
    motherName: person.mother_name,
    originalNative: person.Original_Native,
    culturalDetails: {
      gotra: person.Gotra_Name || null,
      sutra: person.Sutra_Name || null,
      vamsha: person.Vamsha_Name || null,
      kulaDevatha: person.Kula_Devatha_Name || null,
      maneDevru: person.Mane_Devru_Name || null,
      panchangSudhi: person.Panchang_Sudhi_Name || null,
      poojaVruksha: person.Pooja_Vruksha_Name || null,
    },
  };

  // Contact and residential information is selected and returned only
  // for Admin requests. Ordinary User SQL queries do not select these fields.
  if (includePrivate) {
    mapped.phoneNumber = person.Phone_Number;
    mapped.mobileNumber = person.Mobile_Number;
    mapped.email = person.Email;
    mapped.currentAddress = person.Current_Address;
  }

  return mapped;
};

// ======================================================
// NORMALIZE RELATIONSHIP TYPE
// ======================================================

const normalizeRelationType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

// ======================================================
// NORMALIZE RELATIONSHIP DIRECTION
// ======================================================

/*
  Relationship direction follows relation.service.js.

  A --Father/Mother--> B

  A is the parent.
  B is the child.

  A --Son/Daughter--> B

  A is the child.
  B is the parent.

  Reverse rows carry the reciprocal relation type, so both stored
  directions normalize to the same parentId/childId pair.
*/

const normalizeRelation = (relation) => {
  const sourceId = Number(relation.Person_Id);

  const targetId = Number(
    relation.Related_Person_Id
  );

  const relationType = normalizeRelationType(
    relation.Relation_Type
  );

  if (
    !Number.isSafeInteger(sourceId) ||
    sourceId <= 0 ||
    !Number.isSafeInteger(targetId) ||
    targetId <= 0 ||
    sourceId === targetId
  ) {
    return null;
  }

  // Source is the parent for Father/Mother relationship labels.

  if (
    relationType === "father" ||
    relationType === "mother"
  ) {
    return {
      type: "parent",
      parentId: sourceId,
      childId: targetId,
    };
  }

  // Source is the child for Son/Daughter relationship labels.

  if (
    relationType === "son" ||
    relationType === "daughter"
  ) {
    return {
      type: "parent",
      parentId: targetId,
      childId: sourceId,
    };
  }

  // Spouse relationship.

  if (
    relationType === "husband-wife" ||
    relationType === "wife-husband"
  ) {
    return {
      type: "spouse",
      personId: sourceId,
      relatedPersonId: targetId,
    };
  }

  // Sibling relationship.

  if (
    relationType === "brother" ||
    relationType === "sister"
  ) {
    return {
      type: "sibling",
      personId: sourceId,
      relatedPersonId: targetId,
    };
  }

  return null;
};

// ======================================================
// BIDIRECTIONAL RELATIONSHIP MAP
// ======================================================

const addBidirectionalLink = (
  map,
  firstId,
  secondId
) => {
  const first = Number(firstId);

  const second = Number(secondId);

  if (
    !Number.isSafeInteger(first) ||
    first <= 0 ||
    !Number.isSafeInteger(second) ||
    second <= 0 ||
    first === second
  ) {
    return;
  }

  if (!map.has(first)) {
    map.set(first, new Set());
  }

  if (!map.has(second)) {
    map.set(second, new Set());
  }

  map.get(first).add(second);

  map.get(second).add(first);
};

// ======================================================
// GET RELATIONSHIP IDS
// ======================================================

const getIds = (map, id) =>
  [...(map.get(Number(id)) || [])];

// ======================================================
// FETCH SPOUSE FAMILY DETAILS
// ======================================================

const fetchFamilySummaries = async (familyIds, options = {}) => {
  const ids = [...new Set((familyIds || []).map(Number))].filter(
    (id) => Number.isSafeInteger(id) && id > 0
  );

  if (ids.length === 0) return new Map();

  const placeholders = ids.map(() => "?").join(",");

  const [rows] = await db.execute(
    `SELECT
       f.Family_Id,
       f.Family_Name,
       f.Reference_Id,
       f.Native_Place,
       f.Gotra_Id,
       g.Gotra_Name
     FROM family f
     LEFT JOIN gothra g ON g.Gotra_Id = f.Gotra_Id
     WHERE f.Family_Id IN (${placeholders})`,
    ids
  );

  const result = new Map(rows.map((row) => [
    Number(row.Family_Id),
    {
      familyId: Number(row.Family_Id),
      familyName: row.Family_Name,
      referenceId: row.Reference_Id,
      nativePlace: row.Native_Place,
      gotraId: row.Gotra_Id === null ? null : Number(row.Gotra_Id),
      gotraName: row.Gotra_Name || null,
    },
  ]));

  // For ordinary Users, attach the full NON-CONFIDENTIAL member records
  // of each directly connected spouse family. This is a single-hop family
  // expansion: marriages of collateral members are not traversed.
  if (options.includeMembers) {
    const allowedPersonIds = options.allowedPersonIds || null;
    const includePrivate = Boolean(options.includePrivate);

    for (const familyId of ids) {
      const familySummary = result.get(familyId);
      if (!familySummary) continue;

      const [memberRows] = await db.execute(
        `${getPersonSelect(includePrivate)}
         WHERE p.Family_Id = ?
         ORDER BY p.Person_Id ASC`,
        [familyId]
      );

      const safeRows = allowedPersonIds
        ? memberRows.filter((person) => allowedPersonIds.has(Number(person.Person_Id)))
        : memberRows;

      familySummary.members = safeRows.map((person) =>
        mapPerson(person, includePrivate)
      );
      familySummary.totalMembers = familySummary.members.length;
    }
  }

  return result;
};
// ======================================================
// GET COMPLETE FAMILY DETAILS
// ======================================================

const getFamilyDetails = async (familyId, options = {}) => {
  const validFamilyId = parsePositiveId(familyId, "Family ID");
  const accessContext = options.accessContext || null;
  const isGlobal = Boolean(accessContext && accessContext.isGlobal);
  const includePrivate = isGlobal;

  if (!isGlobal) {
    if (!accessContext || accessContext.role !== "User") {
      throw createError("A valid family access context is required", 403);
    }

    const permittedFamilyIds = new Set(
      (accessContext.familyIds || []).map(Number)
    );

    if (!permittedFamilyIds.has(validFamilyId)) {
      // Use 404 to avoid confirming that another family exists.
      throw createError("Family not found", 404);
    }
  }

  const allowedPersonIds = isGlobal
    ? null
    : new Set((accessContext.extendedPersonIds || []).map(Number));

  const bloodlinePersonIds = isGlobal
    ? null
    : new Set((accessContext.bloodlinePersonIds || []).map(Number));

  const allowedSpouseIds = isGlobal
    ? null
    : new Set((accessContext.spousePersonIds || []).map(Number));

  const permittedBloodlineFamilyIds = isGlobal
    ? null
    : new Set((accessContext.bloodlineFamilyIds || []).map(Number));

  // ====================================================
  // STEP 1: FETCH SELECTED FAMILY
  // ====================================================

  const [familyRows] = await db.execute(
    `SELECT
       f.Family_Id,
       f.Reference_Id,
       f.Family_Name,
       f.Native_Place,
       f.Head_DOB,
       f.Gotra_Id,
       f.Created_At,
       g.Gotra_Name

     FROM family f

     LEFT JOIN gothra g
       ON g.Gotra_Id = f.Gotra_Id

     WHERE f.Family_Id = ?

     LIMIT 1`,
    [validFamilyId]
  );

  if (familyRows.length === 0) {
    throw createError("Family not found", 404);
  }

  const family = familyRows[0];

  const mappedFamily = {
    familyId: Number(family.Family_Id),

    referenceId: family.Reference_Id,

    familyName: family.Family_Name,

    nativePlace: family.Native_Place,

    headDob: family.Head_DOB,

    gotraId:
      family.Gotra_Id === null
        ? null
        : Number(family.Gotra_Id),

    gotraName: family.Gotra_Name || null,

    createdAt: family.Created_At,
  };

  // ====================================================
  // STEP 2: FETCH FAMILY MEMBERS
  // ====================================================

  const [queriedMemberRows] = await db.execute(
    `${getPersonSelect(includePrivate)}
     WHERE p.Family_Id = ?
     ORDER BY p.Person_Id ASC`,
    [validFamilyId]
  );

  const memberRows = isGlobal
    ? queriedMemberRows
    : queriedMemberRows.filter((person) =>
        allowedPersonIds.has(Number(person.Person_Id))
      );

  // Handle an empty family.

  if (memberRows.length === 0) {
    return {
      family: mappedFamily,

      headPerson: null,

      spouse: null,

      spouses: [],

      spouseFamily: null,

      spouseFamilies: [],

      children: [],

      siblingBranches: [],

      members: [],
      extendedFamilyOnly: !isGlobal && !permittedBloodlineFamilyIds.has(validFamilyId),
      familyAccess: isGlobal
        ? { scope: "global", isGlobal: true }
        : {
            scope: "relationship_based",
            isGlobal: false,
            anchorPersonId: Number(accessContext.anchorPersonId),
          },

      meta: {
        totalMembers: 0,
        totalChildren: 0,
        totalSiblings: 0,
        generationsProcessed: 0,
        truncated: false,
        treeAvailable: isGlobal || permittedBloodlineFamilyIds.has(validFamilyId),
      },
    };
  }

  // A spouse-side family is authorized for non-confidential Family Details,
  // but it must not become a new bloodline tree root for this User.
  const isBloodlineFamily = isGlobal || permittedBloodlineFamilyIds.has(validFamilyId);

  if (!isBloodlineFamily) {
    return {
      family: mappedFamily,
      headPerson: null,
      spouse: null,
      spouses: [],
      spouseFamily: null,
      spouseFamilies: [],
      children: [],
      siblingBranches: [],
      members: memberRows.map((person) => mapPerson(person, false)),
      extendedFamilyOnly: true,
      meta: {
        totalMembers: memberRows.length,
        totalChildren: 0,
        totalSiblings: 0,
        generationsProcessed: 0,
        truncated: false,
        treeAvailable: false,
      },
    };
  }

  // ====================================================
  // STEP 3: IDENTIFY FAMILY HEAD
  // ====================================================

  /*
    Preserve your existing project convention.

    The person with the earliest Person_Id
    in the selected family is the family head.
  */

  const headRow = isGlobal
    ? memberRows[0]
    : memberRows
        .filter((person) => bloodlinePersonIds.has(Number(person.Person_Id)))
        .sort((a, b) => Number(a.Person_Id) - Number(b.Person_Id))[0];

  if (!headRow) {
    return {
      family: mappedFamily,
      headPerson: null,
      spouse: null,
      spouses: [],
      spouseFamily: null,
      spouseFamilies: [],
      children: [],
      siblingBranches: [],
      members: memberRows.map((person) => mapPerson(person, false)),
      extendedFamilyOnly: true,
      meta: {
        totalMembers: memberRows.length,
        totalChildren: 0,
        totalSiblings: 0,
        generationsProcessed: 0,
        truncated: false,
        treeAvailable: false,
      },
    };
  }

  const headId = Number(headRow.Person_Id);

  // ====================================================
  // STEP 4: INITIALIZE PERSON CACHE
  // ====================================================

  const peopleCache = new Map(
    memberRows.map((person) => [
      Number(person.Person_Id),
      person,
    ])
  );

  // Relationship maps.

  const spouseMap = new Map();

  const siblingMap = new Map();

  const childrenByParent = new Map();

  // Avoid repeatedly fetching the same relationships.

  const relationsLoadedFor = new Set();

  // ====================================================
  // STEP 5: FETCH PEOPLE WHEN REQUIRED
  // ====================================================

  const ensurePeople = async (personIds) => {
    const ids = [
      ...new Set(personIds.map(Number)),
    ].filter(
      (id) => Number.isSafeInteger(id) && id > 0
    );

    const missingIds = ids.filter(
      (id) => !peopleCache.has(id) &&
        (isGlobal || allowedPersonIds.has(id))
    );

    if (missingIds.length === 0) {
      return;
    }

    const placeholders = missingIds
      .map(() => "?")
      .join(",");

    const [rows] = await db.execute(
      `${getPersonSelect(includePrivate)}
       WHERE p.Person_Id IN (${placeholders})`,
      missingIds
    );

    for (const person of rows) {
      peopleCache.set(
        Number(person.Person_Id),
        person
      );
    }
  };

  // ====================================================
  // STEP 6: LOAD ALL RELATIONSHIPS FOR PEOPLE
  // ====================================================

  const loadRelationsFor = async (personIds) => {
    const ids = [
      ...new Set(personIds.map(Number)),
    ].filter(
      (id) => Number.isSafeInteger(id) && id > 0
    );

    const freshIds = ids.filter(
      (id) => !relationsLoadedFor.has(id)
    );

    if (freshIds.length === 0) {
      return;
    }

    const placeholders = freshIds
      .map(() => "?")
      .join(",");

    freshIds.forEach((id) =>
      relationsLoadedFor.add(id)
    );

    const [relations] = await db.execute(
      `SELECT
         Relation_Id,
         Person_Id,
         Related_Person_Id,
         Relation_Type

       FROM family_relation

       WHERE Person_Id IN (${placeholders})
          OR Related_Person_Id IN (${placeholders})

       ORDER BY Relation_Id ASC`,
      [...freshIds, ...freshIds]
    );

    for (const relation of relations) {
      const sourceId = Number(relation.Person_Id);
      const targetId = Number(relation.Related_Person_Id);

      if (!isGlobal) {
        if (!allowedPersonIds.has(sourceId) || !allowedPersonIds.has(targetId)) {
          continue;
        }
      }

      const normalized = normalizeRelation(relation);
      if (!normalized) continue;

      if (!isGlobal) {
        if (normalized.type === "spouse") {
          const permittedSpousePair =
            (bloodlinePersonIds.has(sourceId) && allowedSpouseIds.has(targetId)) ||
            (bloodlinePersonIds.has(targetId) && allowedSpouseIds.has(sourceId));

          if (!permittedSpousePair) continue;
        } else if (normalized.type === "sibling") {
          if (
            !bloodlinePersonIds.has(sourceId) ||
            !bloodlinePersonIds.has(targetId)
          ) continue;
        } else if (normalized.type === "parent") {
          if (
            !bloodlinePersonIds.has(normalized.parentId) ||
            !bloodlinePersonIds.has(normalized.childId)
          ) continue;
        }
      }

      // ----------------------------------------------
      // SPOUSE
      // ----------------------------------------------

      if (normalized.type === "spouse") {
        addBidirectionalLink(
          spouseMap,
          normalized.personId,
          normalized.relatedPersonId
        );

        continue;
      }

      // ----------------------------------------------
      // SIBLING
      // ----------------------------------------------

      if (normalized.type === "sibling") {
        addBidirectionalLink(
          siblingMap,
          normalized.personId,
          normalized.relatedPersonId
        );

        continue;
      }

      // ----------------------------------------------
      // PARENT / CHILD
      // ----------------------------------------------

      if (normalized.type === "parent") {
        if (
          !childrenByParent.has(
            normalized.parentId
          )
        ) {
          childrenByParent.set(
            normalized.parentId,
            new Set()
          );
        }

        childrenByParent
          .get(normalized.parentId)
          .add(normalized.childId);
      }
    }
  };

  // ====================================================
  // STEP 7: LOAD FAMILY HEAD RELATIONSHIPS
  // ====================================================

  await loadRelationsFor([headId]);

  // Get family head spouses.

  const headSpouseIds = getIds(
    spouseMap,
    headId
  ).filter((id) => isGlobal || allowedSpouseIds.has(id)).sort((a, b) => a - b);

  // Get family head siblings.

  const headSiblingIds = getIds(
    siblingMap,
    headId
  )
    .filter((id) => id !== headId && (isGlobal || bloodlinePersonIds.has(id)))
    .sort((a, b) => a - b);

  await ensurePeople([
    ...headSpouseIds,
    ...headSiblingIds,
  ]);

  // Load spouse relationships.
  // Their children may be linked to either parent.

  await loadRelationsFor(headSpouseIds);

  const validHeadSpouseIds = headSpouseIds.filter(
    (id) => peopleCache.has(id)
  );

  // ====================================================
  // STEP 8: INITIALIZE HIERARCHY TRACKING
  // ====================================================

  /*
    The visited set prevents:
    - Duplicate people.
    - Duplicate reverse relationships.
    - Infinite recursion.
    - Circular family relationships.
  */

  const visitedBloodline = new Set([
    headId,
  ]);

  const descendantsCount = {
    value: 0,
  };

  const deepestGeneration = {
    value: 0,
  };

  const truncated = {
    value: false,
  };

  // ====================================================
  // STEP 9: RECURSIVELY BUILD PERSON AND DESCENDANTS
  // ====================================================

  const buildPersonNode = async (
    personId,
    generation,
    path,
    countAsDescendant = true
  ) => {
    const id = Number(personId);

    // Prevent duplicate people and cycles.

    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      path.has(id) ||
      visitedBloodline.has(id)
    ) {
      return null;
    }

    const personRow = peopleCache.get(id);

    if (!personRow) {
      return null;
    }

    // Maximum descendant limit.

    if (
      countAsDescendant &&
      descendantsCount.value >= MAX_DESCENDANTS
    ) {
      truncated.value = true;
      return null;
    }

    visitedBloodline.add(id);

    if (countAsDescendant) {
      descendantsCount.value += 1;
    }

    // Maximum generation limit.

    if (generation > MAX_GENERATIONS) {
      truncated.value = true;

      return {
        ...mapPerson(personRow, includePrivate),

        spouse: null,
        spouses: [],
        spousePersonId: null,
        children: [],
      };
    }

    deepestGeneration.value = Math.max(
      deepestGeneration.value,
      generation
    );

    // ----------------------------------------------
    // LOAD PERSON RELATIONSHIPS
    // ----------------------------------------------

    await loadRelationsFor([id]);

    // ----------------------------------------------
    // GET PERSON'S SPOUSE(S)
    // ----------------------------------------------

    const spouseIds = getIds(
      spouseMap,
      id
    )
      .filter((spouseId) => spouseId !== id && (isGlobal || allowedSpouseIds.has(spouseId)))
      .sort((a, b) => a - b);

    await ensurePeople(spouseIds);

    // Load spouse relationships as well.
    // Their children must be considered.

    await loadRelationsFor(spouseIds);

    // ----------------------------------------------
    // GET CHILDREN OF PERSON AND SPOUSE(S)
    // ----------------------------------------------

    const parentIds = [
      id,
      ...spouseIds,
    ];

    const childIds = new Set();

    for (const parentId of parentIds) {
      const relatedChildren =
        childrenByParent.get(parentId);

      if (!relatedChildren) continue;

      for (const childId of relatedChildren) {
        const child = Number(childId);

        if (
          child !== id &&
          !path.has(child) &&
          !spouseIds.includes(child) &&
          (isGlobal || bloodlinePersonIds.has(child))
        ) {
          childIds.add(child);
        }
      }
    }

    const orderedChildIds = [
      ...childIds,
    ].sort((a, b) => a - b);

    await ensurePeople(orderedChildIds);

    // ----------------------------------------------
    // PREPARE NEXT GENERATION PATH
    // ----------------------------------------------

    const nextPath = new Set(path);

    nextPath.add(id);

    for (const spouseId of spouseIds) {
      nextPath.add(spouseId);
    }

    // ----------------------------------------------
    // RECURSIVELY BUILD CHILDREN
    // ----------------------------------------------

    const children = [];

    for (const childId of orderedChildIds) {
      if (
        !peopleCache.has(childId) ||
        nextPath.has(childId) ||
        visitedBloodline.has(childId)
      ) {
        continue;
      }

      if (
        descendantsCount.value >= MAX_DESCENDANTS
      ) {
        truncated.value = true;
        break;
      }

      const childNode = await buildPersonNode(
        childId,
        generation + 1,
        nextPath,
        true
      );

      if (childNode) {
        children.push(childNode);
      }
    }

    return {
      ...mapPerson(personRow, includePrivate),

      spouse: null,
      spouses: [],

      spousePersonId: spouseIds[0] || null,

      children,
    };
  };

  // ====================================================
  // STEP 10: BUILD FAMILY HEAD'S DESCENDANTS
  // ====================================================

  /*
    The family head and spouse(s) are at the root level.

    Their children begin at Generation 2.
  */

  const headParentIds = [
    headId,
    ...validHeadSpouseIds,
  ];

  await loadRelationsFor(headParentIds);

  const directChildIds = new Set();

  for (const parentId of headParentIds) {
    const relatedChildren =
      childrenByParent.get(parentId) || [];

    for (const childId of relatedChildren) {
      const id = Number(childId);

      if (
        id !== headId &&
        !validHeadSpouseIds.includes(id) &&
        (isGlobal || bloodlinePersonIds.has(id))
      ) {
        directChildIds.add(id);
      }
    }
  }

  const orderedDirectChildIds = [
    ...directChildIds,
  ].sort((a, b) => a - b);

  await ensurePeople(orderedDirectChildIds);

  const children = [];

  for (const childId of orderedDirectChildIds) {
    if (
      !peopleCache.has(childId) ||
      visitedBloodline.has(childId)
    ) {
      continue;
    }

    if (
      descendantsCount.value >= MAX_DESCENDANTS
    ) {
      truncated.value = true;
      break;
    }

    const childNode = await buildPersonNode(
      childId,
      1,
      new Set([headId]),
      true
    );

    if (childNode) {
      children.push(childNode);
    }
  }

  // ====================================================
  // STEP 11: BUILD SIBLING BRANCHES
  // ====================================================

  /*
    IMPORTANT:

    A brother or sister of the family head must remain
    at the SAME hierarchy level as the family head.

    The sibling is NOT treated as the head's child.

    However, the sibling's:
    - Spouse(s)
    - Children
    - Grandchildren
    - Great-grandchildren
    - Further descendants

    are recursively included.
  */

  const siblingBranches = [];

  for (const siblingId of headSiblingIds) {
    if (
      !peopleCache.has(siblingId) ||
      visitedBloodline.has(siblingId) ||
      validHeadSpouseIds.includes(siblingId)
    ) {
      continue;
    }

    const siblingNode = await buildPersonNode(
      siblingId,
      0,
      new Set([headId]),
      false
    );

    if (!siblingNode) continue;

    siblingBranches.push({
      person: mapPerson(
        peopleCache.get(siblingId),
        includePrivate
      ),

      spouse: null,

      spouses: [],

      spousePersonId:
        siblingNode.spousePersonId,

      children:
        siblingNode.children,
    });
  }

  // ====================================================
  // STEP 12: COLLECT ALL SPOUSE IDS
  // ====================================================

  /*
    Spouse details are fetched for:
    - Family head
    - Head's children
    - Grandchildren
    - Sibling branches
    - All further generations
  */

  const allSpouseIds = new Set();

  for (const personId of visitedBloodline) {
    const spouseIds = getIds(
      spouseMap,
      personId
    ).filter((spouseId) => isGlobal || allowedSpouseIds.has(spouseId));

    for (const spouseId of spouseIds) {
      if (peopleCache.has(spouseId)) {
        allSpouseIds.add(spouseId);
      }
    }
  }

  await ensurePeople([...allSpouseIds]);

  // ====================================================
  // STEP 13: FETCH SPOUSE FAMILY DETAILS
  // ====================================================

  const spouseFamilyIds = [...new Set(
    [...allSpouseIds]
      .map((id) => peopleCache.get(id))
      .filter(Boolean)
      .map((person) => Number(person.Family_Id))
      .filter((id) => Number.isSafeInteger(id) && id > 0)
      .filter((id) => isGlobal || (accessContext.spouseFamilyIds || []).includes(id))
      .filter((id) => isGlobal || !permittedBloodlineFamilyIds.has(id))
  )];

  const spouseFamilyMap = await fetchFamilySummaries(
    spouseFamilyIds,
    {
      includeMembers: !isGlobal,
      includePrivate,
      allowedPersonIds,
    }
  );

  const mapSpouse = (person) => {
    if (!person) return null;

    return {
      ...mapPerson(person, includePrivate),

      family:
        spouseFamilyMap.get(
          Number(person.Family_Id)
        ) || null,
    };
  };

  // ====================================================
  // STEP 14: MAP ALL SPOUSES
  // ====================================================

  const getMappedSpouses = (personId) =>
    getIds(spouseMap, personId)
      .map((id) => peopleCache.get(id))
      .filter(Boolean)
      .map(mapSpouse);

  // ====================================================
  // STEP 15: ATTACH SPOUSE AND FAMILY DETAILS
  // ====================================================

  const attachSpouseDetails = (personNode) => {
    const spouses = getMappedSpouses(
      personNode.personId
    );

    return {
      ...personNode,

      spouse: spouses[0] || null,

      spouses,

      spousePersonId:
        spouses[0]?.personId || null,

      children: (
        personNode.children || []
      ).map(attachSpouseDetails),
    };
  };

  // Attach spouse details to the head's children.

  const mappedChildren = children.map(
    attachSpouseDetails
  );

  // Attach spouse details to the head.

  const mappedHeadSpouses = getMappedSpouses(
    headId
  );

  const mappedHeadSpouse =
    mappedHeadSpouses[0] || null;

  // Attach spouse details to each sibling branch.

  const mappedSiblingBranches = siblingBranches.map(
    (branch) => {
      const siblingId = branch.person.personId;

      const spouses = getMappedSpouses(
        siblingId
      );

      return {
        ...branch,

        spouse: spouses[0] || null,

        spouses,

        spousePersonId:
          spouses[0]?.personId || null,

        children: branch.children.map(
          attachSpouseDetails
        ),
      };
    }
  );

  // ====================================================
  // STEP 16: FINAL FAMILY DETAILS RESPONSE
  // ====================================================

  return {
    family: mappedFamily,

    headPerson: mapPerson(headRow, includePrivate),

    spouse: mappedHeadSpouse,

    spouses: mappedHeadSpouses,

    spouseFamily:
      mappedHeadSpouse?.family || null,

    spouseFamilies: [...new Map(
      [...allSpouseIds]
        .map((id) => peopleCache.get(id))
        .filter(Boolean)
        .map((person) => spouseFamilyMap.get(Number(person.Family_Id)))
        .filter(Boolean)
        .map((family) => [family.familyId, family])
    ).values()],

    extendedFamilyOnly: false,

    familyAccess: isGlobal
      ? { scope: "global", isGlobal: true }
      : {
          scope: "relationship_based",
          isGlobal: false,
          anchorPersonId: Number(accessContext.anchorPersonId),
        },

    // Main family head descendants.

    children: mappedChildren,

    // Brothers and sisters at the same root level.

    siblingBranches: mappedSiblingBranches,

    // Preserve every person assigned to this family,
    // including people without relationship records.

    members: memberRows.map((person) => mapPerson(person, includePrivate)),

    meta: {
      totalMembers: memberRows.length,

      totalChildren: descendantsCount.value,

      totalSiblings: mappedSiblingBranches.length,

      generationsProcessed:
        deepestGeneration.value,

      truncated: truncated.value,
      treeAvailable: true,
    },
  };
};

// ======================================================
// EXPORT SERVICE
// ======================================================

module.exports = {
  getFamilyDetails,
};