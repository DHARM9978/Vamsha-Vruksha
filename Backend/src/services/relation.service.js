const pool = require("../config/db");
const logger = require("../utils/logger");

// ======================================================
// CONSTANTS
// ======================================================

const RELATION_TYPES = [
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Husband-Wife",
  "Wife-Husband",
];

const SPOUSE_RELATIONS = [
  "Husband-Wife",
  "Wife-Husband",
];

// Multiple spouse records are intentionally supported. The current schema
// has no marriage status, start/end dates, or divorce/deceased marker, so a
// hard one-spouse cap could reject valid historical or remarriage records.
// Duplicate links for the same pair are still blocked transactionally.

// ======================================================
// COMMON HELPERS
// ======================================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePositiveId = (value, fieldName) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(
      `${fieldName} must be a valid positive integer`
    );
  }

  return id;
};

const validateRelationType = (relationType) => {
  if (
    typeof relationType !== "string" ||
    !RELATION_TYPES.includes(relationType)
  ) {
    throw createError(
      `Invalid relationType. Allowed values: ${RELATION_TYPES.join(", ")}`
    );
  }

  return relationType;
};

const isSpouseRelation = (relationType) => {
  return SPOUSE_RELATIONS.includes(relationType);
};

const rollbackSafely = async (connection) => {
  try {
    await connection.rollback();
  } catch (error) {
    // Preserve the original error.
  }
};

// ======================================================
// REVERSE RELATIONSHIP LOGIC
// ======================================================

const getGenderLabel = (
  gender,
  maleLabel,
  femaleLabel
) => {
  const normalizedGender = String(gender || "")
    .trim()
    .toLowerCase();

  if (normalizedGender === "male") {
    return maleLabel;
  }

  if (normalizedGender === "female") {
    return femaleLabel;
  }

  throw createError(
    "Cannot determine reverse relationship because the person's gender is missing or unsupported"
  );
};

const getReverseRelationType = (
  relationType,
  relatedPersonGender
) => {
  switch (relationType) {
    case "Father":
    case "Mother":
      return getGenderLabel(
        relatedPersonGender,
        "Son",
        "Daughter"
      );

    case "Son":
    case "Daughter":
      return getGenderLabel(
        relatedPersonGender,
        "Father",
        "Mother"
      );

    case "Brother":
    case "Sister":
      return getGenderLabel(
        relatedPersonGender,
        "Brother",
        "Sister"
      );

    case "Husband-Wife":
      return "Wife-Husband";

    case "Wife-Husband":
      return "Husband-Wife";

    default:
      throw createError(
        "Unsupported relationship type"
      );
  }
};

// ======================================================
// FETCH AND LOCK TWO PEOPLE
// ======================================================

const getPeopleForRelation = async (
  connection,
  personId,
  relatedPersonId
) => {
  const [people] = await connection.execute(
    `SELECT
       Person_Id,
       Family_Id,
       Gender,
       First_Name,
       Last_Name
     FROM person
     WHERE Person_Id IN (?, ?)
     ORDER BY Person_Id ASC
     FOR UPDATE`,
    [personId, relatedPersonId]
  );

  if (people.length !== 2) {
    throw createError(
      "One or both people were not found",
      404
    );
  }

  const person = people.find(
    (item) => Number(item.Person_Id) === personId
  );

  const relatedPerson = people.find(
    (item) =>
      Number(item.Person_Id) === relatedPersonId
  );

  if (!person || !relatedPerson) {
    throw createError(
      "One or both people were not found",
      404
    );
  }

  return {
    person,
    relatedPerson,
  };
};

// ======================================================
// RELATIONSHIP SEMANTIC AND INTEGRITY VALIDATION
// ======================================================

const normalizeGender = (gender) => {
  const value = String(gender || "").trim().toLowerCase();
  if (value === "male" || value === "m") return "male";
  if (value === "female" || value === "f") return "female";
  return null;
};

const validateRelationGender = (person, relatedPerson, relationType) => {
  const sourceGender = normalizeGender(person.Gender);
  const targetGender = normalizeGender(relatedPerson.Gender);

  const expectedSourceGender = {
    Father: "male",
    Mother: "female",
    Son: "male",
    Daughter: "female",
    Brother: "male",
    Sister: "female",
    "Husband-Wife": "male",
    "Wife-Husband": "female",
  }[relationType];

  if (!sourceGender || !targetGender) {
    throw createError(
      "Both people must have a supported gender (Male or Female) before this relationship can be created"
    );
  }

  if (sourceGender !== expectedSourceGender) {
    throw createError(
      `${relationType} is not valid for a ${sourceGender} person`
    );
  }

  if (relationType === "Husband-Wife" && targetGender !== "female") {
    throw createError("Husband-Wife requires the related person to be Female");
  }

  if (relationType === "Wife-Husband" && targetGender !== "male") {
    throw createError("Wife-Husband requires the related person to be Male");
  }
};

const validateFamilyRelationship = (person, relatedPerson, relationType) => {
  if (isSpouseRelation(relationType)) {
    // Spouses may belong to different family records.
    return;
  }

  if (
    person.Family_Id === null || person.Family_Id === undefined ||
    relatedPerson.Family_Id === null || relatedPerson.Family_Id === undefined
  ) {
    throw createError(
      "Both people must belong to a family before adding a non-spouse relationship"
    );
  }

  if (Number(person.Family_Id) !== Number(relatedPerson.Family_Id)) {
    throw createError(
      "Non-spouse relationships must be between people in the same family"
    );
  }
};

const isParentChildRelation = (relationType) =>
  ["Father", "Mother", "Son", "Daughter"].includes(relationType);

const getParentChildEndpoints = (personId, relatedPersonId, relationType) => {
  if (relationType === "Father" || relationType === "Mother") {
    return { parentId: personId, childId: relatedPersonId };
  }
  if (relationType === "Son" || relationType === "Daughter") {
    return { parentId: relatedPersonId, childId: personId };
  }
  return null;
};

const makePairKey = (firstId, secondId) => {
  const low = Math.min(Number(firstId), Number(secondId));
  const high = Math.max(Number(firstId), Number(secondId));
  return `${low}:${high}`;
};

// Serialize parent/child graph mutations so two concurrent requests cannot
// independently pass the cycle test and then create a directed ancestry loop.
const PARENT_GRAPH_LOCK_NAME = "vv_parent_graph_integrity";

const acquireParentGraphLock = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT GET_LOCK(?, 10) AS acquired",
    [PARENT_GRAPH_LOCK_NAME]
  );

  if (Number(rows[0]?.acquired) !== 1) {
    const error = createError(
      "Could not acquire the family relationship integrity lock. Please retry.",
      503
    );
    error.code = "RELATIONSHIP_LOCK_UNAVAILABLE";
    throw error;
  }
};

const releaseParentGraphLock = async (connection) => {
  try {
    const [rows] = await connection.execute(
      "SELECT RELEASE_LOCK(?) AS released",
      [PARENT_GRAPH_LOCK_NAME]
    );
    return Number(rows[0]?.released) === 1;
  } catch (error) {
    logger.error("Could not release parent graph advisory lock", {
      message: error.message,
    });
    return false;
  }
};

const getExistingParentsForChild = async (connection, childId) => {
  const [rows] = await connection.execute(
    `SELECT
       CASE
         WHEN fr.Relation_Type IN ('Father', 'Mother') THEN fr.Person_Id
         ELSE fr.Related_Person_Id
       END AS parentId,
       CASE
         WHEN fr.Relation_Type IN ('Father', 'Mother') THEN fr.Related_Person_Id
         ELSE fr.Person_Id
       END AS childId,
       parent.Gender AS parentGender
     FROM family_relation fr
     INNER JOIN person parent
       ON parent.Person_Id = CASE
         WHEN fr.Relation_Type IN ('Father', 'Mother') THEN fr.Person_Id
         ELSE fr.Related_Person_Id
       END
     WHERE
       (fr.Relation_Type IN ('Father', 'Mother') AND fr.Related_Person_Id = ?)
       OR
       (fr.Relation_Type IN ('Son', 'Daughter') AND fr.Person_Id = ?)
     ORDER BY fr.Relation_Id ASC
     FOR UPDATE`,
    [childId, childId]
  );

  return rows;
};

const wouldCreateParentCycle = async (
  connection,
  parentId,
  childId,
  excludedPairKey = null
) => {
  const [rows] = await connection.execute(
    `SELECT Person_Id, Related_Person_Id, Relation_Type
     FROM family_relation
     WHERE Relation_Type IN ('Father', 'Mother', 'Son', 'Daughter')`
  );

  const adjacency = new Map();

  const addEdge = (fromId, toId) => {
    const from = Number(fromId);
    const to = Number(toId);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from <= 0 || to <= 0 || from === to) {
      return;
    }
    if (!adjacency.has(from)) adjacency.set(from, new Set());
    adjacency.get(from).add(to);
  };

  for (const row of rows) {
    const sourceId = Number(row.Person_Id);
    const targetId = Number(row.Related_Person_Id);

    if (excludedPairKey && makePairKey(sourceId, targetId) === excludedPairKey) {
      continue;
    }

    // Father/Mother rows are stored parent -> child. Son/Daughter rows
    // are stored child -> parent, so normalize both representations.
    if (row.Relation_Type === "Father" || row.Relation_Type === "Mother") {
      addEdge(sourceId, targetId);
    } else {
      addEdge(targetId, sourceId);
    }
  }

  // Adding parent -> child creates a cycle only when child already reaches parent.
  const pending = [Number(childId)];
  const visited = new Set();

  while (pending.length > 0) {
    const current = pending.shift();
    if (current === Number(parentId)) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const neighbor of adjacency.get(current) || []) {
      if (!visited.has(neighbor)) pending.push(neighbor);
    }
  }

  return false;
};

const validateParentChildIntegrity = async (
  connection,
  person,
  relatedPerson,
  relationType,
  excludedPair = null
) => {
  if (!isParentChildRelation(relationType)) return;

  const { parentId, childId } = getParentChildEndpoints(
    Number(person.Person_Id),
    Number(relatedPerson.Person_Id),
    relationType
  );

  const newParent = parentId === Number(person.Person_Id)
    ? person
    : relatedPerson;
  const newParentGender = normalizeGender(newParent.Gender);
  const excludedPairKey = excludedPair
    ? makePairKey(excludedPair[0], excludedPair[1])
    : null;

  const existingParents = await getExistingParentsForChild(connection, childId);
  const uniqueParents = new Map();

  for (const row of existingParents) {
    if (excludedPairKey && makePairKey(row.parentId, row.childId) === excludedPairKey) {
      continue;
    }
    uniqueParents.set(Number(row.parentId), row);
  }

  for (const existingParent of uniqueParents.values()) {
    const existingGender = normalizeGender(existingParent.parentGender);

    if (!existingGender) {
      throw createError(
        "An existing parent has missing or unsupported gender data. Correct that person's record before changing this parent relationship",
        409
      );
    }

    if (
      Number(existingParent.parentId) !== parentId &&
      existingGender === newParentGender
    ) {
      const role = newParentGender === "male" ? "father" : "mother";
      throw createError(
        `This child already has a recorded ${role}; only one recorded father and one recorded mother are supported`,
        409
      );
    }
  }

  const createsCycle = await wouldCreateParentCycle(
    connection,
    parentId,
    childId,
    excludedPairKey
  );

  if (createsCycle) {
    throw createError(
      "This parent-child relationship would create an ancestry cycle",
      409
    );
  }
};

// ======================================================
// 1. ADD RELATIONSHIP
// ======================================================

const addRelation = async (personId, input) => {
  const id = parsePositiveId(
    personId,
    "personId"
  );

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw createError(
      "Relationship details must be a JSON object"
    );
  }

  const relatedPersonId = parsePositiveId(
    input.relatedPersonId,
    "relatedPersonId"
  );

  const relationType = validateRelationType(
    input.relationType
  );

  if (id === relatedPersonId) {
    throw createError(
      "A person cannot be related to themselves"
    );
  }

  const connection = await pool.getConnection();
  let parentGraphLockAcquired = false;

  try {
    if (isParentChildRelation(relationType)) {
      await acquireParentGraphLock(connection);
      parentGraphLockAcquired = true;
    }

    await connection.beginTransaction();

    const { person, relatedPerson } =
      await getPeopleForRelation(
        connection,
        id,
        relatedPersonId
      );

    validateFamilyRelationship(person, relatedPerson, relationType);
    validateRelationGender(person, relatedPerson, relationType);
    await validateParentChildIntegrity(
      connection,
      person,
      relatedPerson,
      relationType
    );

    // The reverse row describes relatedPerson's relationship to person,
    // so derive its label from relatedPerson.Gender.
    const reverseRelationType = getReverseRelationType(
      relationType,
      relatedPerson.Gender
    );

    // Prevent duplicates in either direction.
    const [existingRelations] =
      await connection.execute(
        `SELECT Relation_Id
         FROM family_relation
         WHERE
           (Person_Id = ? AND Related_Person_Id = ?)
           OR
           (Person_Id = ? AND Related_Person_Id = ?)
         LIMIT 1
         FOR UPDATE`,
        [
          id,
          relatedPersonId,
          relatedPersonId,
          id,
        ]
      );

    if (existingRelations.length > 0) {
      throw createError(
        "A relationship between these two people already exists",
        409
      );
    }

    // Insert forward relationship.
    const [forwardResult] =
      await connection.execute(
        `INSERT INTO family_relation
         (
           Person_Id,
           Related_Person_Id,
           Relation_Type,
           Created_At
         )
         VALUES (?, ?, ?, NOW())`,
        [
          id,
          relatedPersonId,
          relationType,
        ]
      );

    // Insert reverse relationship.
    const [reverseResult] =
      await connection.execute(
        `INSERT INTO family_relation
         (
           Person_Id,
           Related_Person_Id,
           Relation_Type,
           Created_At
         )
         VALUES (?, ?, ?, NOW())`,
        [
          relatedPersonId,
          id,
          reverseRelationType,
        ]
      );

    await connection.commit();

    return {
      personId: id,
      relatedPersonId,

      relation: {
        relationId: forwardResult.insertId,
        relationType,
      },

      reverseRelation: {
        relationId: reverseResult.insertId,
        relationType: reverseRelationType,
      },

      message:
        "Relationship and reverse relationship created successfully",
    };
  } catch (error) {
    await rollbackSafely(connection);
    throw error;
  } finally {
    let reusable = true;
    if (parentGraphLockAcquired) {
      reusable = await releaseParentGraphLock(connection);
    }
    if (reusable) {
      connection.release();
    } else if (typeof connection.destroy === "function") {
      // Do not return a connection to the pool while it may still own
      // a MySQL advisory lock.
      connection.destroy();
    } else {
      connection.release();
    }
  }
};

// ======================================================
// 2. GET PERSON RELATIONSHIPS
// ======================================================

const getPersonRelations = async (
  personId,
  { accessContext } = {}
) => {
  const id = parsePositiveId(personId, "personId");

  if (!accessContext || typeof accessContext !== "object") {
    throw createError(
      "Family access context is required to read relationships",
      500
    );
  }

  const isGlobalAdmin =
    accessContext.role === "Admin" &&
    accessContext.isGlobal === true;

  let authorizedPersonIds = null;

  if (!isGlobalAdmin) {
    if (
      accessContext.role !== "User" ||
      accessContext.isGlobal === true
    ) {
      throw createError(
        "A valid family access context is required",
        403
      );
    }

    authorizedPersonIds = new Set(
      (Array.isArray(accessContext.extendedPersonIds)
        ? accessContext.extendedPersonIds
        : [])
        .map(Number)
        .filter(
          (value) =>
            Number.isSafeInteger(value) && value > 0
        )
    );

    // Do not reveal whether a person outside the user's permitted
    // family network exists.
    if (!authorizedPersonIds.has(id)) {
      throw createError("Person not found", 404);
    }
  }

  const [personRows] = await pool.execute(
    `SELECT
       Person_Id,
       Gender
     FROM person
     WHERE Person_Id = ?
     LIMIT 1`,
    [id]
  );

  if (personRows.length === 0) {
    throw createError("Person not found", 404);
  }

  const requestedPerson = personRows[0];

  let relatedPersonFilter = "";
  const queryParams = [id, id, id, id];

  if (!isGlobalAdmin) {
    const allowedIds = [...authorizedPersonIds];

    // The requested person must already be in the set, so this
    // list cannot be empty.
    const allowedPlaceholders = allowedIds
      .map(() => "?")
      .join(",");

    relatedPersonFilter = `
       AND other.Person_Id IN (${allowedPlaceholders})
    `;

    queryParams.push(...allowedIds);
  }

  const [rows] = await pool.execute(
    `SELECT
       fr.Relation_Id AS relationId,
       fr.Person_Id AS sourcePersonId,
       fr.Related_Person_Id AS targetPersonId,
       fr.Relation_Type AS storedRelationType,

       CASE
         WHEN fr.Person_Id = ? THEN 'OUTGOING'
         ELSE 'INCOMING'
       END AS direction,

       other.Person_Id AS relatedPersonId,
       other.First_Name AS relatedFirstName,
       other.Last_Name AS relatedLastName,
       other.Gender AS relatedGender,
       other.Family_Id AS relatedFamilyId

     FROM family_relation fr

     INNER JOIN person other
       ON other.Person_Id =
         CASE
           WHEN fr.Person_Id = ?
           THEN fr.Related_Person_Id
           ELSE fr.Person_Id
         END

     WHERE
       (
         fr.Person_Id = ?
         OR fr.Related_Person_Id = ?
       )
       ${relatedPersonFilter}

     ORDER BY fr.Relation_Id ASC`,
    queryParams
  );

  // The database can contain a missing reverse row or historical
  // inconsistencies. Reading both directions above allows the API
  // to return the relationship when at least one valid row exists.
  //
  // Do not insert, update, or delete relationship rows in this read path.

  const relationMap = new Map();

  for (const row of rows) {
    const relatedId = Number(row.relatedPersonId);

    if (
      !Number.isSafeInteger(relatedId) ||
      relatedId <= 0 ||
      relatedId === id
    ) {
      continue;
    }

    // Defensive second check. Do not rely only on the SQL IN clause.
    if (
      authorizedPersonIds &&
      !authorizedPersonIds.has(relatedId)
    ) {
      continue;
    }

    let relationType = row.storedRelationType;

    if (row.direction === "INCOMING") {
      /*
       * Convert the stored relationship to the requested person's
       * perspective. The requested person's gender determines whether
       * the reverse label is Father/Mother, Son/Daughter, Brother/Sister.
       */
      relationType = getReverseRelationType(
        row.storedRelationType,
        requestedPerson.Gender
      );
    }

    const relation = {
      relationId: Number(row.relationId),
      personId: id,
      relatedPersonId: relatedId,
      relationType,
      direction: row.direction,

      relatedPerson: {
        firstName: row.relatedFirstName,
        lastName: row.relatedLastName,
        gender: row.relatedGender,
        familyId:
          row.relatedFamilyId == null
            ? null
            : Number(row.relatedFamilyId),
      },
    };

    const existing = relationMap.get(relatedId);

    // When both stored directions exist, prefer the outgoing row.
    // When only one direction exists, retain that record.
    if (
      !existing ||
      row.direction === "OUTGOING"
    ) {
      relationMap.set(relatedId, relation);
    }
  }

  return [...relationMap.values()];
};


// ======================================================
// 3. UPDATE RELATIONSHIP
// ======================================================

const updateRelation = async (
  relationId,
  input
) => {
  const id = parsePositiveId(relationId, "relationId");

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw createError("Relationship details are required");
  }

  // The UI sends the person whose relationship list is being edited.
  // This is necessary because a displayed relationship can be backed by
  // either the forward row or the reverse row in family_relation.
  const personId = parsePositiveId(input.personId, "personId");
  const relatedPersonId = parsePositiveId(
    input.relatedPersonId,
    "relatedPersonId"
  );
  const relationType = validateRelationType(input.relationType);

  if (personId === relatedPersonId) {
    throw createError("A person cannot be related to themselves");
  }

  const connection = await pool.getConnection();
  let parentGraphLockAcquired = false;

  try {
    // Updates may change an existing relation into or out of a parent edge.
    // Acquire the graph lock before starting the transaction for consistent checks.
    await acquireParentGraphLock(connection);
    parentGraphLockAcquired = true;
    await connection.beginTransaction();

    // Lock the relationship selected by the frontend.
    const [relationRows] = await connection.execute(
      `SELECT
         Relation_Id,
         Person_Id,
         Related_Person_Id,
         Relation_Type
       FROM family_relation
       WHERE Relation_Id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (relationRows.length === 0) {
      throw createError("Relationship not found", 404);
    }

    const selectedRow = relationRows[0];
    const oldPersonId = Number(selectedRow.Person_Id);
    const oldRelatedPersonId = Number(selectedRow.Related_Person_Id);

    // A relation can be displayed from either endpoint. Reject an unrelated
    // personId rather than silently updating the wrong side of the relation.
    if (personId !== oldPersonId && personId !== oldRelatedPersonId) {
      throw createError(
        "personId must match one of the people in the selected relationship"
      );
    }

    // Lock both stored directions of the old relationship.
    const [oldPairRows] = await connection.execute(
      `SELECT
         Relation_Id,
         Person_Id,
         Related_Person_Id
       FROM family_relation
       WHERE
         (Person_Id = ? AND Related_Person_Id = ?)
         OR
         (Person_Id = ? AND Related_Person_Id = ?)
       ORDER BY Relation_Id ASC
       FOR UPDATE`,
      [
        oldPersonId,
        oldRelatedPersonId,
        oldRelatedPersonId,
        oldPersonId,
      ]
    );

    if (!oldPairRows.some((row) => Number(row.Relation_Id) === id)) {
      throw createError("Relationship not found", 404);
    }

    const oldOtherPersonId =
      personId === oldPersonId ? oldRelatedPersonId : oldPersonId;
    const isSamePair = relatedPersonId === oldOtherPersonId;

    // Lock the requested endpoints in ascending Person_Id order before
    // checking for a duplicate pair. This serializes concurrent inserts and
    // updates involving the same two people.
    const { person, relatedPerson } = await getPeopleForRelation(
      connection,
      personId,
      relatedPersonId
    );

    validateFamilyRelationship(person, relatedPerson, relationType);
    validateRelationGender(person, relatedPerson, relationType);
    await validateParentChildIntegrity(
      connection,
      person,
      relatedPerson,
      relationType,
      [oldPersonId, oldRelatedPersonId]
    );

    // Do not silently merge two existing relationships when changing the
    // related person. The current pair is allowed when only its type changes.
    if (!isSamePair) {
      const [existingTargetPair] = await connection.execute(
        `SELECT Relation_Id
         FROM family_relation
         WHERE
           (Person_Id = ? AND Related_Person_Id = ?)
           OR
           (Person_Id = ? AND Related_Person_Id = ?)
         LIMIT 1
         FOR UPDATE`,
        [personId, relatedPersonId, relatedPersonId, personId]
      );

      if (existingTargetPair.length > 0) {
        throw createError(
          "A relationship between these two people already exists",
          409
        );
      }
    }

    // The reverse row describes relatedPerson's relationship to person.
    // Use the gender of the reverse row's source person.
    const reverseRelationType = getReverseRelationType(
      relationType,
      relatedPerson.Gender
    );

    if (isSamePair) {
      // Keep each row's stored direction unchanged. This matters when the
      // frontend selected an incoming row rather than an outgoing row.
      const forwardRows = oldPairRows.filter(
        (row) =>
          Number(row.Person_Id) === personId &&
          Number(row.Related_Person_Id) === relatedPersonId
      );
      const reverseRows = oldPairRows.filter(
        (row) =>
          Number(row.Person_Id) === relatedPersonId &&
          Number(row.Related_Person_Id) === personId
      );

      const forwardRow =
        forwardRows.find((row) => Number(row.Relation_Id) === id) ||
        forwardRows[0] ||
        null;
      const reverseRow =
        reverseRows.find((row) => Number(row.Relation_Id) === id) ||
        reverseRows[0] ||
        null;

      if (forwardRow) {
        await connection.execute(
          `UPDATE family_relation
           SET Relation_Type = ?
           WHERE Relation_Id = ?`,
          [relationType, forwardRow.Relation_Id]
        );
      } else {
        await connection.execute(
          `INSERT INTO family_relation
           (Person_Id, Related_Person_Id, Relation_Type, Created_At)
           VALUES (?, ?, ?, NOW())`,
          [personId, relatedPersonId, relationType]
        );
      }

      if (reverseRow) {
        await connection.execute(
          `UPDATE family_relation
           SET Relation_Type = ?
           WHERE Relation_Id = ?`,
          [reverseRelationType, reverseRow.Relation_Id]
        );
      } else {
        await connection.execute(
          `INSERT INTO family_relation
           (Person_Id, Related_Person_Id, Relation_Type, Created_At)
           VALUES (?, ?, ?, NOW())`,
          [relatedPersonId, personId, reverseRelationType]
        );
      }

      // Retain one row in each direction and remove any duplicate legacy rows.
      const keepIds = new Set(
        [forwardRow?.Relation_Id, reverseRow?.Relation_Id]
          .filter((value) => value !== undefined && value !== null)
          .map(Number)
      );
      const duplicateIds = oldPairRows
        .filter((row) => !keepIds.has(Number(row.Relation_Id)))
        .map((row) => row.Relation_Id);

      if (duplicateIds.length > 0) {
        const placeholders = duplicateIds.map(() => "?").join(", ");
        await connection.execute(
          `DELETE FROM family_relation
           WHERE Relation_Id IN (${placeholders})`,
          duplicateIds
        );
      }
    } else {
      // The selected row becomes the requested direction, regardless of the
      // direction in which it was originally stored.
      await connection.execute(
        `UPDATE family_relation
         SET Person_Id = ?,
             Related_Person_Id = ?,
             Relation_Type = ?
         WHERE Relation_Id = ?`,
        [personId, relatedPersonId, relationType, id]
      );

      const companionRows = oldPairRows.filter(
        (row) => Number(row.Relation_Id) !== id
      );
      const companionRow = companionRows[0] || null;

      if (companionRow) {
        await connection.execute(
          `UPDATE family_relation
           SET Person_Id = ?,
               Related_Person_Id = ?,
               Relation_Type = ?
           WHERE Relation_Id = ?`,
          [
            relatedPersonId,
            personId,
            reverseRelationType,
            companionRow.Relation_Id,
          ]
        );
      } else {
        await connection.execute(
          `INSERT INTO family_relation
           (Person_Id, Related_Person_Id, Relation_Type, Created_At)
           VALUES (?, ?, ?, NOW())`,
          [relatedPersonId, personId, reverseRelationType]
        );
      }

      // Clean up any extra records for the old pair, retaining the selected
      // row and at most one reverse row.
      const duplicateIds = companionRows
        .slice(1)
        .map((row) => row.Relation_Id);

      if (duplicateIds.length > 0) {
        const placeholders = duplicateIds.map(() => "?").join(", ");
        await connection.execute(
          `DELETE FROM family_relation
           WHERE Relation_Id IN (${placeholders})`,
          duplicateIds
        );
      }
    }

    await connection.commit();

    logger.info("Relationship updated successfully");

    return {
      relationId: id,
      personId,
      relatedPersonId,
      relationType,
      reverseRelationType,
      message: "Relationship updated successfully",
    };
  } catch (error) {
    await rollbackSafely(connection);
    throw error;
  } finally {
    let reusable = true;
    if (parentGraphLockAcquired) {
      reusable = await releaseParentGraphLock(connection);
    }
    if (reusable) {
      connection.release();
    } else if (typeof connection.destroy === "function") {
      // Do not return a connection to the pool while it may still own
      // a MySQL advisory lock.
      connection.destroy();
    } else {
      connection.release();
    }
  }
};

// ======================================================
// 4. DELETE RELATIONSHIP
// ======================================================

const deleteRelation = async (relationId) => {
  const id = parsePositiveId(
    relationId,
    "relationId"
  );

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT
         Relation_Id,
         Person_Id,
         Related_Person_Id
       FROM family_relation
       WHERE Relation_Id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      throw createError(
        "Relationship not found",
        404
      );
    }

    const relation = rows[0];

    const personId = Number(
      relation.Person_Id
    );

    const relatedPersonId = Number(
      relation.Related_Person_Id
    );

    // Delete both directions of the relationship.
    await connection.execute(
      `DELETE FROM family_relation
       WHERE
         (Person_Id = ? AND Related_Person_Id = ?)
         OR
         (Person_Id = ? AND Related_Person_Id = ?)`,
      [
        personId,
        relatedPersonId,
        relatedPersonId,
        personId,
      ]
    );

    await connection.commit();

    return {
      relationId: id,
      personId,
      relatedPersonId,
      message:
        "Relationship and reverse relationship deleted successfully",
    };
  } catch (error) {
    await rollbackSafely(connection);
    throw error;
  } finally {
    connection.release();
  }
};

// ======================================================
// EXPORT SERVICE FUNCTIONS
// ======================================================

module.exports = {
  addRelation,
  getPersonRelations,
  updateRelation,
  deleteRelation,
};