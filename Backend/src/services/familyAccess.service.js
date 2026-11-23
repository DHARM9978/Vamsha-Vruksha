
const db = require("../config/db");
const logger = require("../utils/logger");

const RELATION_TYPES = Object.freeze({
  PARENT: new Set(["father", "mother"]),
  CHILD: new Set(["son", "daughter"]),
  SIBLING: new Set(["brother", "sister"]),
  SPOUSE: new Set(["husband-wife", "wife-husband"]),
});

const RELATION_QUERY_BATCH_SIZE = 150;
const PERSON_QUERY_BATCH_SIZE = 500;
const MAX_BLOODLINE_PEOPLE = 5000;

const createError = (
  message,
  statusCode = 400,
  code = "FAMILY_ACCESS_ERROR"
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const parsePositiveId = (value, fieldName = "userId") => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(
      `${fieldName} must be a valid positive integer`,
      401,
      "INVALID_USER_ID"
    );
  }

  return id;
};

const normalizeEmail = (value) =>
  String(value || "").trim().toLowerCase();

const normalizeRelationType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const toPositiveIdOrNull = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
};

const uniquePositiveIds = (values) =>
  [...new Set(
    values.map(toPositiveIdOrNull).filter(Boolean)
  )];

const chunks = (values, size) => {
  const result = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
};

const sameFamily = (firstFamilyId, secondFamilyId) => {
  const first = toPositiveIdOrNull(firstFamilyId);
  const second = toPositiveIdOrNull(secondFamilyId);

  // Non-spouse relationships are valid only when both people
  // belong to the same actual family record.
  return first !== null && second !== null && first === second;
};

const createPlaceholders = (count) =>
  Array.from({ length: count }, () => "?").join(",");

// ======================================================
// GET CURRENT ACCOUNT FROM DATABASE
// ======================================================

const getCurrentAccount = async (userId) => {
  const [rows] = await db.execute(
    `SELECT
       user_id,
       user_email,
       role,
       is_verified
     FROM user_login
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) {
    throw createError(
      "Authenticated account was not found",
      401,
      "ACCOUNT_NOT_FOUND"
    );
  }

  const account = rows[0];
  const role = String(account.role || "User");

  if (role !== "Admin" && role !== "User") {
    throw createError(
      "Account role is not permitted",
      403,
      "INVALID_ACCOUNT_ROLE"
    );
  }

  if (Number(account.is_verified) !== 1) {
    throw createError(
      "Your account must be verified before accessing family information",
      403,
      "ACCOUNT_NOT_VERIFIED"
    );
  }

  return {
    userId: Number(account.user_id),
    email: normalizeEmail(account.user_email),
    role,
  };
};

// ======================================================
// FIND EXISTING USER-PERSON MAPPING
// ======================================================

const findExistingPersonLink = async (userId) => {
  const [rows] = await db.execute(
    `SELECT
       upl.user_id AS userId,
       upl.person_id AS personId,
       upl.link_method AS linkMethod,
       p.Family_Id AS familyId
     FROM user_person_link upl
     INNER JOIN person p
       ON p.Person_Id = upl.person_id
     WHERE upl.user_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
};

// ======================================================
// RESOLVE PERSON USING VERIFIED ACCOUNT EMAIL
// ======================================================

const resolvePersonLinkByVerifiedEmail = async (account) => {
  if (!account.email) {
    throw createError(
      "No family access is available because your account has no email address",
      403,
      "FAMILY_PERSON_NOT_LINKED"
    );
  }

  // LIMIT 2 distinguishes zero, one, and multiple matches.
  // LOWER/TRIM handles legacy values with inconsistent casing or spaces.

  const [matches] = await db.execute(
    `SELECT Person_Id
     FROM person
     WHERE Email IS NOT NULL
       AND TRIM(Email) <> ''
       AND LOWER(TRIM(Email)) = ?
     ORDER BY Person_Id ASC
     LIMIT 2`,
    [account.email]
  );

  if (matches.length === 0) {
    throw createError(
      "No family profile is linked to your account. Please contact an Admin to link your account to the correct family member.",
      403,
      "FAMILY_PERSON_NOT_LINKED"
    );
  }

  if (matches.length > 1) {
    throw createError(
      "Your email matches more than one family member. An Admin must resolve the correct person record before family access can be enabled.",
      409,
      "FAMILY_PERSON_LINK_AMBIGUOUS"
    );
  }

  const personId = Number(matches[0].Person_Id);
  const connection = await db.getConnection();

  let inserted = false;

  try {
    await connection.beginTransaction();

    // Lock the account row to reduce concurrent auto-link attempts.

    const [accountRows] = await connection.execute(
      `SELECT
         user_id,
         user_email,
         role,
         is_verified
       FROM user_login
       WHERE user_id = ?
       FOR UPDATE`,
      [account.userId]
    );

    if (
      accountRows.length === 0 ||
      accountRows[0].role !== "User" ||
      Number(accountRows[0].is_verified) !== 1 ||
      normalizeEmail(accountRows[0].user_email) !== account.email
    ) {
      throw createError(
        "Account state or email changed. Please sign in again.",
        403,
        "ACCOUNT_STATE_CHANGED"
      );
    }

    const [userLinkRows] = await connection.execute(
      `SELECT user_id, person_id
       FROM user_person_link
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [account.userId]
    );

    if (userLinkRows.length > 0) {
      await connection.commit();

      return {
        userId: Number(userLinkRows[0].user_id),
        personId: Number(userLinkRows[0].person_id),
        linkMethod: "existing",
      };
    }

    // Re-check and lock the matched person so an email change
    // between lookup and insert cannot silently create a stale link.

    const [personRows] = await connection.execute(
      `SELECT Person_Id
       FROM person
       WHERE Person_Id = ?
         AND LOWER(TRIM(Email)) = ?
       LIMIT 1
       FOR UPDATE`,
      [personId, account.email]
    );

    if (personRows.length === 0) {
      throw createError(
        "The matching family member email changed during linking. Please sign in again or contact an Admin.",
        409,
        "PERSON_EMAIL_CHANGED"
      );
    }

    const [personLinkRows] = await connection.execute(
      `SELECT user_id
       FROM user_person_link
       WHERE person_id = ?
       LIMIT 1
       FOR UPDATE`,
      [personId]
    );

    if (personLinkRows.length > 0) {
      throw createError(
        "This family member is already linked to another login account. Please contact an Admin.",
        409,
        "PERSON_ALREADY_LINKED"
      );
    }

    await connection.execute(
      `INSERT INTO user_person_link
       (
         user_id,
         person_id,
         linked_by_user_id,
         link_method
       )
       VALUES (?, ?, NULL, 'verified_email')`,
      [account.userId, personId]
    );

    await connection.commit();
    inserted = true;

  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      logger.error("Failed to roll back automatic person linking", {
        userId: account.userId,
        errorName: rollbackError.name,
      });
    }

    // A concurrent request may have created the same mapping.

    if (error && error.code === "ER_DUP_ENTRY") {
      const existing = await findExistingPersonLink(account.userId);

      if (existing && Number(existing.personId) === personId) {
        return {
          userId: account.userId,
          personId,
          linkMethod: "existing",
        };
      }

      throw createError(
        "This account or family member is already linked to another record. Please ask an Admin to review the link.",
        409,
        "PERSON_LINK_CONFLICT"
      );
    }

    throw error;

  } finally {
    connection.release();
  }

  if (inserted) {
    logger.info("Verified account linked to family person", {
      userId: account.userId,
      personId,
      linkMethod: "verified_email",
    });
  }

  return {
    userId: account.userId,
    personId,
    linkMethod: "verified_email",
  };
};

// ======================================================
// RESOLVE AUTHENTICATED PERSON
// ======================================================

const resolveAnchorPerson = async (account) => {
  const existingLink = await findExistingPersonLink(account.userId);

  if (existingLink) {
    return {
      personId: Number(existingLink.personId),
      linkMethod: existingLink.linkMethod || "admin_manual",
    };
  }

  return resolvePersonLinkByVerifiedEmail(account);
};

// ======================================================
// FETCH RELATIONSHIPS FOR A GROUP OF PEOPLE
// ======================================================

const fetchRelationshipsForPeople = async (personIds) => {
  const rowsByRelationId = new Map();

  for (const batch of chunks(
    personIds,
    RELATION_QUERY_BATCH_SIZE
  )) {
    const placeholders = createPlaceholders(batch.length);

    const [rows] = await db.execute(
      `SELECT
         fr.Relation_Id,
         fr.Person_Id,
         fr.Related_Person_Id,
         fr.Relation_Type,
         source_person.Family_Id AS sourceFamilyId,
         target_person.Family_Id AS targetFamilyId

       FROM family_relation fr

       INNER JOIN person source_person
         ON source_person.Person_Id = fr.Person_Id

       INNER JOIN person target_person
         ON target_person.Person_Id = fr.Related_Person_Id

       WHERE fr.Person_Id IN (${placeholders})
          OR fr.Related_Person_Id IN (${placeholders})

       ORDER BY fr.Relation_Id ASC`,
      [...batch, ...batch]
    );

    for (const row of rows) {
      rowsByRelationId.set(
        Number(row.Relation_Id),
        row
      );
    }
  }

  return [...rowsByRelationId.values()];
};

// ======================================================
// INTERPRET RELATIONSHIP RECORD
// ======================================================

const getNeighborFromRelation = (relation) => {
  const sourceId = Number(relation.Person_Id);
  const targetId = Number(relation.Related_Person_Id);

  const type = normalizeRelationType(
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

  if (RELATION_TYPES.PARENT.has(type)) {
    // Stored convention: child -> parent.
    return {
      kind: "bloodline",
      firstId: sourceId,
      secondId: targetId,
    };
  }

  if (RELATION_TYPES.CHILD.has(type)) {
    // Stored convention: parent -> child.
    return {
      kind: "bloodline",
      firstId: sourceId,
      secondId: targetId,
    };
  }

  if (RELATION_TYPES.SIBLING.has(type)) {
    return {
      kind: "bloodline",
      firstId: sourceId,
      secondId: targetId,
    };
  }

  if (RELATION_TYPES.SPOUSE.has(type)) {
    return {
      kind: "spouse",
      firstId: sourceId,
      secondId: targetId,
    };
  }

  return null;
};

// ======================================================
// FETCH FAMILY IDs FOR PEOPLE
// ======================================================

const fetchPersonFamilyRows = async (personIds) => {
  const peopleById = new Map();

  for (const batch of chunks(
    personIds,
    PERSON_QUERY_BATCH_SIZE
  )) {
    const placeholders = createPlaceholders(batch.length);

    const [rows] = await db.execute(
      `SELECT
         Person_Id,
         Family_Id
       FROM person
       WHERE Person_Id IN (${placeholders})`,
      batch
    );

    for (const row of rows) {
      peopleById.set(Number(row.Person_Id), row);
    }
  }

  return peopleById;
};

// ======================================================
// FETCH ALL MEMBERS OF AUTHORIZED FAMILIES
// ======================================================

const fetchFamilyMemberIds = async (familyIds) => {
  const personIds = new Set();

  for (const batch of chunks(
    familyIds,
    PERSON_QUERY_BATCH_SIZE
  )) {
    const placeholders = createPlaceholders(batch.length);

    const [rows] = await db.execute(
      `SELECT Person_Id
       FROM person
       WHERE Family_Id IN (${placeholders})`,
      batch
    );

    for (const row of rows) {
      personIds.add(Number(row.Person_Id));
    }
  }

  return personIds;
};

// ======================================================
// BUILD ORDINARY USER ACCESS CONTEXT
// ======================================================

const buildUserAccessContext = async (account) => {
  const link = await resolveAnchorPerson(account);
  const anchorPersonId = Number(link.personId);

  const [anchorRows] = await db.execute(
    `SELECT
       Person_Id,
       Family_Id
     FROM person
     WHERE Person_Id = ?
     LIMIT 1`,
    [anchorPersonId]
  );

  if (anchorRows.length === 0) {
    throw createError(
      "The linked family member no longer exists. Please contact an Admin.",
      403,
      "LINKED_PERSON_NOT_FOUND"
    );
  }

  const anchorFamilyId = toPositiveIdOrNull(
    anchorRows[0].Family_Id
  );

  if (!anchorFamilyId) {
    throw createError(
      "Your linked family member is not assigned to a family. Please contact an Admin.",
      403,
      "PERSON_NOT_ASSIGNED_TO_FAMILY"
    );
  }

  const bloodlinePersonIds = new Set([anchorPersonId]);
  const spousePersonIds = new Set();
  const processedIds = new Set();
  const queue = [anchorPersonId];
  const seenRelationIds = new Set();

  // Traverse only parent/child and sibling relationships.
  // Spouse records are collected separately and are never queued.

  while (queue.length > 0) {
    const batch = queue.splice(
      0,
      RELATION_QUERY_BATCH_SIZE
    );

    const freshBatch = batch.filter(
      (id) => !processedIds.has(id)
    );

    if (freshBatch.length === 0) {
      continue;
    }

    freshBatch.forEach((id) => processedIds.add(id));

    const relationships =
      await fetchRelationshipsForPeople(freshBatch);

    for (const relation of relationships) {
      const relationId = Number(relation.Relation_Id);

      if (seenRelationIds.has(relationId)) {
        continue;
      }

      seenRelationIds.add(relationId);

      const normalized = getNeighborFromRelation(relation);

      if (!normalized) {
        continue;
      }

      const firstId = normalized.firstId;
      const secondId = normalized.secondId;

      // ----------------------------------------------
      // SPOUSE RELATIONSHIPS
      // ----------------------------------------------

      if (normalized.kind === "spouse") {
        if (bloodlinePersonIds.has(firstId)) {
          if (!bloodlinePersonIds.has(secondId)) {
            spousePersonIds.add(secondId);
          }
        }

        if (bloodlinePersonIds.has(secondId)) {
          if (!bloodlinePersonIds.has(firstId)) {
            spousePersonIds.add(firstId);
          }
        }

        continue;
      }

      // ----------------------------------------------
      // BLOODLINE RELATIONSHIPS
      // ----------------------------------------------

      // Non-spouse relationships must stay inside
      // the same actual family record.

      if (
        !sameFamily(
          relation.sourceFamilyId,
          relation.targetFamilyId
        )
      ) {
        continue;
      }

      const firstIsBloodline =
        bloodlinePersonIds.has(firstId);

      const secondIsBloodline =
        bloodlinePersonIds.has(secondId);

      if (!firstIsBloodline && !secondIsBloodline) {
        continue;
      }

      const neighborId = firstIsBloodline
        ? secondId
        : firstId;

      if (bloodlinePersonIds.has(neighborId)) {
        continue;
      }

      if (
        bloodlinePersonIds.size >= MAX_BLOODLINE_PEOPLE
      ) {
        throw createError(
          `Family relationship network exceeds the configured limit of ${MAX_BLOODLINE_PEOPLE} people. Ask an Admin to review the family data.`,
          413,
          "FAMILY_NETWORK_LIMIT_EXCEEDED"
        );
      }

      bloodlinePersonIds.add(neighborId);
      queue.push(neighborId);
    }
  }

  // ====================================================
  // COLLECT SPOUSES OF ALL BLOODLINE MEMBERS
  // ====================================================

  // Re-query all discovered bloodline IDs. This captures
  // spouse rows that were first encountered in another batch.

  const allBloodlineIds = [...bloodlinePersonIds];

  const allRelations =
    await fetchRelationshipsForPeople(allBloodlineIds);

  for (const relation of allRelations) {
    const normalized = getNeighborFromRelation(relation);

    if (!normalized || normalized.kind !== "spouse") {
      continue;
    }

    if (
      bloodlinePersonIds.has(normalized.firstId) &&
      !bloodlinePersonIds.has(normalized.secondId)
    ) {
      spousePersonIds.add(normalized.secondId);
    }

    if (
      bloodlinePersonIds.has(normalized.secondId) &&
      !bloodlinePersonIds.has(normalized.firstId)
    ) {
      spousePersonIds.add(normalized.firstId);
    }
  }

  // ====================================================
  // IDENTIFY BLOODLINE AND SPOUSE FAMILY IDs
  // ====================================================

  const allIdentityIds = uniquePositiveIds([
    ...allBloodlineIds,
    ...spousePersonIds,
  ]);

  const identityPeople =
    await fetchPersonFamilyRows(allIdentityIds);

  const bloodlineFamilyIds = uniquePositiveIds(
    allBloodlineIds.map(
      (id) => identityPeople.get(id)?.Family_Id
    )
  );

  const spouseFamilyIds = uniquePositiveIds(
    [...spousePersonIds].map(
      (id) => identityPeople.get(id)?.Family_Id
    )
  ).filter(
    (id) => !bloodlineFamilyIds.includes(id)
  );

  const familyIds = uniquePositiveIds([
    ...bloodlineFamilyIds,
    ...spouseFamilyIds,
  ]);

  // ====================================================
  // COLLECT EXTENDED FAMILY PERSON IDs
  // ====================================================

  // This expands family membership for the bloodline and
  // directly connected spouses, but does not traverse the
  // marriages of collateral members in spouse-side families.

  const spouseFamilyMemberIds =
    await fetchFamilyMemberIds(familyIds);

  const extendedPersonIds = new Set([
    ...allBloodlineIds,
    ...spousePersonIds,
    ...spouseFamilyMemberIds,
  ]);

  // ====================================================
  // RETURN ORDINARY USER ACCESS CONTEXT
  // ====================================================

  return {
    userId: account.userId,

    role: "User",

    isGlobal: false,

    anchorPersonId,

    linkMethod: link.linkMethod,

    // Members belonging to the bloodline hierarchy.
    bloodlinePersonIds: allBloodlineIds,

    // Spouses connected directly to bloodline members.
    spousePersonIds: [...spousePersonIds],

    // Bloodline + spouses + members of authorized families.
    extendedPersonIds: [...extendedPersonIds],

    // Family records belonging to the bloodline.
    bloodlineFamilyIds,

    // Other family records introduced by spouses.
    spouseFamilyIds,

    // All permitted family IDs.
    familyIds,

    limits: {
      maxBloodlinePeople: MAX_BLOODLINE_PEOPLE,
      actualBloodlinePeople: bloodlinePersonIds.size,
      actualSpousePeople: spousePersonIds.size,
      actualExtendedPeople: extendedPersonIds.size,
    },
  };
};

// ======================================================
// MAIN ACCESS CONTEXT
// ======================================================

const getFamilyAccessContext = async (userId) => {
  const validUserId = parsePositiveId(userId);

  // Always retrieve the current account role from MySQL.
  // Do not rely on a role supplied by the frontend or JWT alone.

  const account = await getCurrentAccount(validUserId);

  // Admin retains global access.

  if (account.role === "Admin") {
    return {
      userId: account.userId,

      role: "Admin",

      isGlobal: true,

      anchorPersonId: null,

      linkMethod: null,

      bloodlinePersonIds: [],
      spousePersonIds: [],
      extendedPersonIds: [],

      bloodlineFamilyIds: [],
      spouseFamilyIds: [],
      familyIds: [],

      limits: null,
    };
  }

  // Ordinary Users must have an identified person record.
  return buildUserAccessContext(account);
};

// ======================================================
// CHECK FAMILY ACCESS
// ======================================================

const hasFamilyAccess = (accessContext, familyId) => {
  if (!accessContext) {
    return false;
  }

  if (accessContext.isGlobal) {
    return true;
  }

  const id = toPositiveIdOrNull(familyId);

  if (!id) {
    return false;
  }

  return accessContext.familyIds.includes(id);
};

// ======================================================
// CHECK EXTENDED PERSON ACCESS
// ======================================================

const hasPersonAccess = (accessContext, personId) => {
  if (!accessContext) {
    return false;
  }

  if (accessContext.isGlobal) {
    return true;
  }

  const id = toPositiveIdOrNull(personId);

  if (!id) {
    return false;
  }

  return accessContext.extendedPersonIds.includes(id);
};

// ======================================================
// CHECK BLOODLINE PERSON ACCESS
// ======================================================

const hasBloodlinePersonAccess = (
  accessContext,
  personId
) => {
  if (!accessContext) {
    return false;
  }

  if (accessContext.isGlobal) {
    return true;
  }

  const id = toPositiveIdOrNull(personId);

  if (!id) {
    return false;
  }

  return accessContext.bloodlinePersonIds.includes(id);
};

// ======================================================
// EXPORT SERVICE
// ======================================================

module.exports = {
  getFamilyAccessContext,
  hasFamilyAccess,
  hasPersonAccess,
  hasBloodlinePersonAccess,
};
