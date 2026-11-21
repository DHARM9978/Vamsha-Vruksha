
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
// VALIDATE FAMILY RELATIONSHIP RULES
// ======================================================

const validateFamilyRelationship = (
  person,
  relatedPerson,
  relationType
) => {
  if (isSpouseRelation(relationType)) {
    // Spouse relationships may connect different families.
    return;
  }

  if (
    Number(person.Family_Id) !==
    Number(relatedPerson.Family_Id)
  ) {
    throw createError(
      "Non-spouse relationships must be between people in the same family"
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

  if (!input || typeof input !== "object") {
    throw createError(
      "Relationship details are required"
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

  try {
    await connection.beginTransaction();

    const { person, relatedPerson } =
      await getPeopleForRelation(
        connection,
        id,
        relatedPersonId
      );

    validateFamilyRelationship(
      person,
      relatedPerson,
      relationType
    );

    const reverseRelationType =
      getReverseRelationType(
        relationType,
        person.Gender
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
    connection.release();
  }
};

// ======================================================
// 2. GET PERSON RELATIONSHIPS
// ======================================================

const getPersonRelations = async (personId) => {
  const id = parsePositiveId(
    personId,
    "personId"
  );

  const [personRows] = await pool.execute(
    `SELECT Person_Id
     FROM person
     WHERE Person_Id = ?
     LIMIT 1`,
    [id]
  );

  if (personRows.length === 0) {
    throw createError("Person not found", 404);
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
       fr.Person_Id = ?
       OR fr.Related_Person_Id = ?

     ORDER BY fr.Relation_Id ASC`,
    [id, id, id, id]
  );

  // Avoid returning both stored directions as duplicates.
  const relationMap = new Map();

  for (const row of rows) {
    let relationType = row.storedRelationType;

    if (row.direction === "INCOMING") {
      /*
       * IMPORTANT:
       * The reverse relationship must be calculated
       * using the gender of the original source person.
       *
       * For an incoming row, "other" is that source person.
       */
      relationType = getReverseRelationType(
        row.storedRelationType,
        row.relatedGender
      );
    }

    const relation = {
      relationId: row.relationId,
      personId: id,
      relatedPersonId: row.relatedPersonId,
      relationType,
      direction: row.direction,

      relatedPerson: {
        firstName: row.relatedFirstName,
        lastName: row.relatedLastName,
        gender: row.relatedGender,
        familyId: row.relatedFamilyId,
      },
    };

    const relatedId = Number(
      row.relatedPersonId
    );

    const existing = relationMap.get(relatedId);

    // Prefer outgoing records when both directions exist.
    if (
      !existing ||
      row.direction === "OUTGOING"
    ) {
      relationMap.set(
        relatedId,
        relation
      );
    }
  }

  return Array.from(
    relationMap.values()
  );
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

  try {
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

    const { person, relatedPerson } = await getPeopleForRelation(
      connection,
      personId,
      relatedPersonId
    );

    validateFamilyRelationship(person, relatedPerson, relationType);

    // relationType describes relatedPerson from personId's perspective.
    // The reverse label must therefore be based on person.Gender.
    const reverseRelationType = getReverseRelationType(
      relationType,
      person.Gender
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
    connection.release();
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
