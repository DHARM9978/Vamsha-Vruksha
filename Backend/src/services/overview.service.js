const db = require("../config/db");

const DEFAULT_RECENT_LIMIT = 5;
const SCOPE_BATCH_SIZE = 500;

// ======================================================
// COMMON HELPERS
// ======================================================

const createError = (message, statusCode = 400, code = "OVERVIEW_ERROR") => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const uniquePositiveIds = (values) => [
  ...new Set(
    (Array.isArray(values) ? values : [])
      .map(Number)
      .filter((id) => Number.isSafeInteger(id) && id > 0)
  ),
];

const chunks = (values, size = SCOPE_BATCH_SIZE) => {
  const result = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
};

const placeholders = (count) =>
  Array.from({ length: count }, () => "?").join(",");

const personFullName = (row) =>
  [row.firstName, row.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

// ======================================================
// ADMIN GLOBAL OVERVIEW
// Existing Admin behavior is preserved.
// ======================================================

const getOverviewStatistics = async () => {
  const [rows] = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM family) AS totalFamilies,
      (SELECT COUNT(*) FROM person) AS totalPeople,
      (SELECT COUNT(*) FROM family_relation) AS totalRelationshipRecords,
      (SELECT COUNT(*) FROM user_login) AS totalUsers
  `);

  const row = rows[0];

  return {
    totalFamilies: Number(row.totalFamilies),
    totalPeople: Number(row.totalPeople),
    totalRelationships: await getUniqueRelationshipCount(),
    totalUsers: Number(row.totalUsers),
  };
};

const getUniqueRelationshipCount = async () => {
  const [rows] = await db.execute(`
    SELECT COUNT(*) AS totalRelationships
    FROM (
      SELECT
        LEAST(Person_Id, Related_Person_Id) AS personA,
        GREATEST(Person_Id, Related_Person_Id) AS personB
      FROM family_relation
      WHERE Person_Id IS NOT NULL
        AND Related_Person_Id IS NOT NULL
      GROUP BY
        LEAST(Person_Id, Related_Person_Id),
        GREATEST(Person_Id, Related_Person_Id)
    ) AS unique_relationships
  `);

  return Number(rows[0].totalRelationships);
};

// ======================================================
// ADMIN RECENT ADDITIONS
// Existing global Admin behavior is preserved.
// ======================================================

const getRecentFamilies = async (limit = DEFAULT_RECENT_LIMIT) => {
  const [rows] = await db.execute(
    `
      SELECT
        f.Family_Id AS id,
        f.Family_Name AS familyName,
        f.Reference_Id AS referenceId,
        f.Created_At AS createdAt
      FROM family f
      ORDER BY f.Created_At DESC, f.Family_Id DESC
      LIMIT ?
    `,
    [limit]
  );

  return rows.map((row) => ({
    type: "family",
    id: row.id,
    title: `Family created: ${row.familyName}`,
    familyName: row.familyName,
    referenceId: row.referenceId,
    createdAt: row.createdAt,
    dateAvailable: Boolean(row.createdAt),
  }));
};

const getRecentPeople = async (limit = DEFAULT_RECENT_LIMIT) => {
  const [rows] = await db.execute(
    `
      SELECT
        p.Person_Id AS id,
        p.First_Name AS firstName,
        p.Last_Name AS lastName,
        p.Family_Id AS familyId,
        f.Family_Name AS familyName
      FROM person p
      LEFT JOIN family f
        ON f.Family_Id = p.Family_Id
      ORDER BY p.Person_Id DESC
      LIMIT ?
    `,
    [limit]
  );

  return rows.map((row) => {
    const fullName = personFullName(row);

    return {
      type: "person",
      id: row.id,
      title: row.familyName
        ? `Person added: ${fullName} to ${row.familyName}`
        : `Person added: ${fullName}`,
      personName: fullName,
      familyId: row.familyId,
      familyName: row.familyName,
      createdAt: null,
      dateAvailable: false,
      orderingNote:
        "Ordered by Person_Id; actual creation date is not stored",
    };
  });
};

const getRecentRelationships = async (limit = DEFAULT_RECENT_LIMIT) => {
  const [rows] = await db.execute(
    `
      SELECT
        fr.Relation_Id AS id,
        fr.Person_Id AS personId,
        fr.Related_Person_Id AS relatedPersonId,
        fr.Relation_Type AS relationType,
        fr.Created_At AS createdAt,
        p1.First_Name AS firstFirstName,
        p1.Last_Name AS firstLastName,
        p2.First_Name AS secondFirstName,
        p2.Last_Name AS secondLastName
      FROM family_relation fr
      INNER JOIN (
        SELECT MIN(Relation_Id) AS Relation_Id
        FROM family_relation
        WHERE Person_Id IS NOT NULL
          AND Related_Person_Id IS NOT NULL
        GROUP BY
          LEAST(Person_Id, Related_Person_Id),
          GREATEST(Person_Id, Related_Person_Id)
      ) unique_pairs
        ON unique_pairs.Relation_Id = fr.Relation_Id
      LEFT JOIN person p1
        ON p1.Person_Id = fr.Person_Id
      LEFT JOIN person p2
        ON p2.Person_Id = fr.Related_Person_Id
      ORDER BY fr.Created_At DESC, fr.Relation_Id DESC
      LIMIT ?
    `,
    [limit]
  );

  return rows.map((row) => {
    const firstPerson = [
      row.firstFirstName,
      row.firstLastName,
    ].filter(Boolean).join(" ").trim();

    const secondPerson = [
      row.secondFirstName,
      row.secondLastName,
    ].filter(Boolean).join(" ").trim();

    return {
      type: "relationship",
      id: row.id,
      title: `Relationship added: ${firstPerson} — ${row.relationType} — ${secondPerson}`,
      personId: row.personId,
      relatedPersonId: row.relatedPersonId,
      relationType: row.relationType,
      firstPerson,
      secondPerson,
      createdAt: row.createdAt,
      dateAvailable: Boolean(row.createdAt),
    };
  });
};

const getRecentAdditions = async () => {
  const [families, persons, relationships] = await Promise.all([
    getRecentFamilies(DEFAULT_RECENT_LIMIT),
    getRecentPeople(DEFAULT_RECENT_LIMIT),
    getRecentRelationships(DEFAULT_RECENT_LIMIT),
  ]);

  return {
    families,
    persons,
    relationships,
    note:
      "Person creation dates are unavailable because the person table has no Created_At column.",
  };
};

const getAdminOverview = async () => {
  const [statistics, recentAdditions] = await Promise.all([
    getOverviewStatistics(),
    getRecentAdditions(),
  ]);

  return {
    overviewType: "Admin",
    statistics,
    recentAdditions,
  };
};

// ======================================================
// USER ACCESS CONTEXT VALIDATION
// ======================================================

const validateUserAccessContext = (accessContext) => {
  if (!accessContext || typeof accessContext !== "object") {
    throw createError(
      "Family access context is required for User overview",
      500,
      "FAMILY_ACCESS_CONTEXT_MISSING"
    );
  }

  if (
    accessContext.role !== "User" ||
    accessContext.isGlobal === true
  ) {
    throw createError(
      "A valid ordinary User family access context is required",
      403,
      "INVALID_FAMILY_ACCESS_CONTEXT"
    );
  }

  return {
    familyIds: uniquePositiveIds(accessContext.familyIds),
    personIds: uniquePositiveIds(accessContext.extendedPersonIds),
  };
};

// ======================================================
// USER-SCOPED COUNTS
// ======================================================

const countFamiliesInScope = async (familyIds) => {
  if (familyIds.length === 0) return 0;

  let total = 0;

  for (const batch of chunks(familyIds)) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM family
       WHERE Family_Id IN (${placeholders(batch.length)})`,
      batch
    );

    total += Number(rows[0]?.total || 0);
  }

  return total;
};

const countPeopleInScope = async (personIds) => {
  if (personIds.length === 0) return 0;

  let total = 0;

  for (const batch of chunks(personIds)) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM person
       WHERE Person_Id IN (${placeholders(batch.length)})`,
      batch
    );

    total += Number(rows[0]?.total || 0);
  }

  return total;
};

// ======================================================
// USER-SCOPED RECENT FAMILIES
// ======================================================

const getRecentFamiliesForScope = async (
  familyIds,
  limit = DEFAULT_RECENT_LIMIT
) => {
  if (familyIds.length === 0) return [];

  const familyMap = new Map();

  for (const batch of chunks(familyIds)) {
    const [rows] = await db.execute(
      `
        SELECT
          f.Family_Id AS id,
          f.Family_Name AS familyName,
          f.Reference_Id AS referenceId,
          f.Created_At AS createdAt
        FROM family f
        WHERE f.Family_Id IN (${placeholders(batch.length)})
        ORDER BY f.Created_At DESC, f.Family_Id DESC
        LIMIT ?
      `,
      [...batch, limit]
    );

    for (const row of rows) {
      familyMap.set(Number(row.id), row);
    }
  }

  return [...familyMap.values()]
    .sort((a, b) => {
      const dateA = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;
      const dateB = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return dateB - dateA || Number(b.id) - Number(a.id);
    })
    .slice(0, limit)
    .map((row) => ({
      type: "family",
      id: row.id,
      title: `Family created: ${row.familyName}`,
      familyName: row.familyName,
      referenceId: row.referenceId,
      createdAt: row.createdAt,
      dateAvailable: Boolean(row.createdAt),
    }));
};

// ======================================================
// USER-SCOPED RECENT PEOPLE
// ======================================================

const getRecentPeopleForScope = async (
  personIds,
  limit = DEFAULT_RECENT_LIMIT
) => {
  if (personIds.length === 0) return [];

  const peopleMap = new Map();

  for (const batch of chunks(personIds)) {
    const [rows] = await db.execute(
      `
        SELECT
          p.Person_Id AS id,
          p.First_Name AS firstName,
          p.Last_Name AS lastName,
          p.Family_Id AS familyId,
          f.Family_Name AS familyName
        FROM person p
        LEFT JOIN family f
          ON f.Family_Id = p.Family_Id
        WHERE p.Person_Id IN (${placeholders(batch.length)})
        ORDER BY p.Person_Id DESC
        LIMIT ?
      `,
      [...batch, limit]
    );

    for (const row of rows) {
      peopleMap.set(Number(row.id), row);
    }
  }

  return [...peopleMap.values()]
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, limit)
    .map((row) => {
      const fullName = personFullName(row);

      return {
        type: "person",
        id: row.id,
        title: row.familyName
          ? `Person added: ${fullName} to ${row.familyName}`
          : `Person added: ${fullName}`,
        personName: fullName,
        familyId: row.familyId,
        familyName: row.familyName,
        createdAt: null,
        dateAvailable: false,
        orderingNote:
          "Ordered by Person_Id; actual creation date is not stored",
      };
    });
};

// ======================================================
// USER-SCOPED RELATIONSHIPS
// ======================================================

const getUniqueRelationshipsForScope = async (personIds) => {
  if (personIds.length === 0) {
    return [];
  }

  const allowedIds = new Set(personIds);
  const pairMap = new Map();

  for (const batch of chunks(personIds)) {
    const [rows] = await db.execute(
      `
        SELECT
          Relation_Id AS id,
          Person_Id AS personId,
          Related_Person_Id AS relatedPersonId,
          Relation_Type AS relationType,
          Created_At AS createdAt
        FROM family_relation
        WHERE Person_Id IN (${placeholders(batch.length)})
           OR Related_Person_Id IN (${placeholders(batch.length)})
        ORDER BY Relation_Id ASC
      `,
      [...batch, ...batch]
    );

    for (const row of rows) {
      const personId = Number(row.personId);
      const relatedPersonId = Number(row.relatedPersonId);

      // Both endpoints must be inside the authorized scope.
      if (
        !allowedIds.has(personId) ||
        !allowedIds.has(relatedPersonId) ||
        personId === relatedPersonId
      ) {
        continue;
      }

      const firstId = Math.min(personId, relatedPersonId);
      const secondId = Math.max(personId, relatedPersonId);
      const key = `${firstId}:${secondId}`;

      const existing = pairMap.get(key);

      // Match the Admin overview's established convention:
      // count each person pair once and keep the lowest Relation_Id.
      if (!existing || Number(row.id) < Number(existing.id)) {
        pairMap.set(key, {
          ...row,
          personId: firstId,
          relatedPersonId: secondId,
        });
      }
    }
  }

  return [...pairMap.values()];
};

const getRecentRelationshipsForScope = async (
  personIds,
  limit = DEFAULT_RECENT_LIMIT
) => {
  const uniqueRelationships =
    await getUniqueRelationshipsForScope(personIds);

  if (uniqueRelationships.length === 0) {
    return [];
  }

  const sorted = uniqueRelationships
    .sort((a, b) => {
      const dateA = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;
      const dateB = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return dateB - dateA || Number(b.id) - Number(a.id);
    })
    .slice(0, limit);

  const personIdsForNames = uniquePositiveIds(
    sorted.flatMap((row) => [
      row.personId,
      row.relatedPersonId,
    ])
  );

  const peopleById = new Map();

  for (const batch of chunks(personIdsForNames)) {
    const [rows] = await db.execute(
      `
        SELECT
          Person_Id AS personId,
          First_Name AS firstName,
          Last_Name AS lastName
        FROM person
        WHERE Person_Id IN (${placeholders(batch.length)})
      `,
      batch
    );

    for (const row of rows) {
      peopleById.set(Number(row.personId), row);
    }
  }

  return sorted.map((row) => {
    const first = peopleById.get(Number(row.personId));
    const second = peopleById.get(Number(row.relatedPersonId));

    const firstPerson = first ? personFullName(first) : "";
    const secondPerson = second ? personFullName(second) : "";

    return {
      type: "relationship",
      id: row.id,
      title: `Relationship added: ${firstPerson} — ${row.relationType} — ${secondPerson}`,
      personId: row.personId,
      relatedPersonId: row.relatedPersonId,
      relationType: row.relationType,
      firstPerson,
      secondPerson,
      createdAt: row.createdAt,
      dateAvailable: Boolean(row.createdAt),
    };
  });
};

// ======================================================
// USER OVERVIEW
// Statistics and recent additions are limited to the
// authenticated user's authorized family network.
// ======================================================

const getUserOverview = async ({ accessContext } = {}) => {
  const access = validateUserAccessContext(accessContext);

  const [
    totalFamilies,
    totalPeople,
    uniqueRelationships,
    recentFamilies,
    recentPeople,
  ] = await Promise.all([
    countFamiliesInScope(access.familyIds),
    countPeopleInScope(access.personIds),
    getUniqueRelationshipsForScope(access.personIds),
    getRecentFamiliesForScope(
      access.familyIds,
      DEFAULT_RECENT_LIMIT
    ),
    getRecentPeopleForScope(
      access.personIds,
      DEFAULT_RECENT_LIMIT
    ),
  ]);

  const recentRelationships = await getRecentRelationshipsForScope(
    access.personIds,
    DEFAULT_RECENT_LIMIT
  );

  return {
    overviewType: "User",
    statistics: {
      totalFamilies,
      totalPeople,
      totalRelationships: uniqueRelationships.length,
    },
    recentAdditions: {
      families: recentFamilies,
      persons: recentPeople,
      relationships: recentRelationships,
      note:
        "Only records within your authorized family network are included. Person creation dates are unavailable because the person table has no Created_At column.",
    },
  };
};

// ======================================================
// PUBLIC OVERVIEW
// Existing public aggregate statistics are preserved.
// ======================================================

const getPublicOverview = async () => {
  const statistics = await getOverviewStatistics();

  return {
    totalFamilies: statistics.totalFamilies,
    totalPeople: statistics.totalPeople,
    totalRelationships: statistics.totalRelationships,
    totalUsers: statistics.totalUsers,
  };
};

module.exports = {
  getAdminOverview,
  getUserOverview,
  getPublicOverview,
};