
const db = require("../config/db");

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

    // family_relation stores both directions of a relationship.
    // Count unique person pairs for the Overview card.
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

// Latest family records, using the actual Created_At timestamp.
const getRecentFamilies = async (limit = 5) => {
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

// Latest person records, ordered by Person_Id.
// The current person table does not contain a creation timestamp.
const getRecentPeople = async (limit = 5) => {
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
    const fullName = [row.firstName, row.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

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
      orderingNote: "Ordered by Person_Id; actual creation date is not stored",
    };
  });
};

// Get one row for each unique pair of related people.
// The legacy relationship service stores forward and reverse rows.
const getRecentRelationships = async (limit = 5) => {
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
    getRecentFamilies(5),
    getRecentPeople(5),
    getRecentRelationships(5),
  ]);

  return {
    families,
    persons,
    relationships,
    note: "Person creation dates are unavailable because the person table has no Created_At column.",
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

const getUserOverview = async () => {
  const [statistics, recentAdditions] = await Promise.all([
    getOverviewStatistics(),
    getRecentAdditions(),
  ]);

  return {
    overviewType: "User",
    statistics: {
      totalFamilies: statistics.totalFamilies,
      totalPeople: statistics.totalPeople,
      totalRelationships: statistics.totalRelationships,
    },
    recentAdditions,
  };
};

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
