
const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const PERSON_BATCH_SIZE = 400;
const FAMILY_BATCH_SIZE = 400;
const RELATION_BATCH_SIZE = 200;
const MAX_EXTENDED_PERSONS = 10000;

const createError = (message, statusCode = 500, code = "MY_FAMILY_ERROR") => {
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

const chunks = (values, size) => {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
};

const placeholders = (count) =>
  Array.from({ length: count }, () => "?").join(",");

const mapFamily = (row, bloodlineFamilyIds) => ({
  familyId: Number(row.Family_Id),
  referenceId: row.Reference_Id,
  familyName: row.Family_Name,
  nativePlace: row.Native_Place,
  headDob: row.Head_DOB,
  gotraId: row.Gotra_Id == null ? null : Number(row.Gotra_Id),
  gotraName: row.Gotra_Name || null,
  createdAt: row.Created_At,
  accessScope: bloodlineFamilyIds.has(Number(row.Family_Id))
    ? "bloodline"
    : "spouse_family",
});

const mapPerson = (row, context) => {
  const personId = Number(row.Person_Id);
  const bloodlineIds = context._bloodlineIds;
  const spouseIds = context._spouseIds;

  let accessRelationship = "spouse_family_member";
  if (bloodlineIds.has(personId)) {
    accessRelationship = "bloodline";
  } else if (spouseIds.has(personId)) {
    accessRelationship = "spouse";
  }

  return {
    personId,
    familyId: row.Family_Id == null ? null : Number(row.Family_Id),
    firstName: row.First_Name,
    lastName: row.Last_Name,
    fullName: [row.First_Name, row.Last_Name]
      .filter(Boolean)
      .join(" ")
      .trim() || `Person ${personId}`,
    fatherName: row.father_name,
    motherName: row.mother_name,
    gender: row.Gender,
    dob: row.DOB,
    originalNative: row.Original_Native,
    culturalDetails: {
      gotra: row.Gotra_Name || null,
      sutra: row.Sutra_Name || null,
      vamsha: row.Vamsha_Name || null,
      kulaDevatha: row.Kula_Devatha_Name || null,
      maneDevru: row.Mane_Devru_Name || null,
      panchangSudhi: row.Panchang_Sudhi_Name || null,
      poojaVruksha: row.Pooja_Vruksha_Name || null,
    },
    accessRelationship,
    isBloodlineMember: bloodlineIds.has(personId),
    isSpouseOfBloodlineMember: spouseIds.has(personId),
  };
};

const fetchFamilies = async (familyIds, bloodlineFamilyIds) => {
  const familyRows = new Map();

  for (const batch of chunks(familyIds, FAMILY_BATCH_SIZE)) {
    const [rows] = await db.execute(
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
       LEFT JOIN gothra g ON g.Gotra_Id = f.Gotra_Id
       WHERE f.Family_Id IN (${placeholders(batch.length)})
       ORDER BY f.Family_Id ASC`,
      batch
    );

    for (const row of rows) {
      familyRows.set(Number(row.Family_Id), row);
    }
  }

  return [...familyRows.values()].map((row) =>
    mapFamily(row, bloodlineFamilyIds)
  );
};

const fetchPeople = async (personIds, context) => {
  const personRows = new Map();

  for (const batch of chunks(personIds, PERSON_BATCH_SIZE)) {
    const [rows] = await db.execute(
      `SELECT
         p.Person_Id,
         p.Family_Id,
         p.First_Name,
         p.Last_Name,
         p.father_name,
         p.mother_name,
         p.Gender,
         p.DOB,
         p.Original_Native,
         g.Gotra_Name,
         s.Sutra_Name,
         v.Vamsha_Name,
         kd.Kula_Devatha_Name,
         md.Mane_Devru_Name,
         ps.Panchang_Sudhi_Name,
         pv.Pooja_Vruksha_Name
       FROM person p
       LEFT JOIN gothra g ON g.Gotra_Id = p.Gotra_Id
       LEFT JOIN sutra s ON s.Sutra_Id = p.Sutra_Id
       LEFT JOIN vamsha v ON v.Vamsha_Id = p.Vamsha_Id
       LEFT JOIN kula_devatha kd ON kd.Kula_Devatha_Id = p.Kula_Devatha_Id
       LEFT JOIN mane_devru md ON md.Mane_Devru_Id = p.Mane_Devru_Id
       LEFT JOIN panchang_sudhi ps ON ps.Panchang_Sudhi_Id = p.Panchang_Sudhi_Id
       LEFT JOIN pooja_vruksha pv ON pv.Pooja_Vruksha_Id = p.Pooja_Vruksha_Id
       WHERE p.Person_Id IN (${placeholders(batch.length)})
       ORDER BY p.Family_Id ASC, p.Person_Id ASC`,
      batch
    );

    for (const row of rows) {
      personRows.set(Number(row.Person_Id), row);
    }
  }

  return [...personRows.values()].map((row) => mapPerson(row, context));
};

const fetchAuthorizedRelationships = async (personIds) => {
  const authorizedIds = new Set(personIds);
  const relationships = new Map();

  for (const batch of chunks(personIds, RELATION_BATCH_SIZE)) {
    const [rows] = await db.execute(
      `SELECT
         Relation_Id,
         Person_Id,
         Related_Person_Id,
         Relation_Type
       FROM family_relation
       WHERE Person_Id IN (${placeholders(batch.length)})
          OR Related_Person_Id IN (${placeholders(batch.length)})
       ORDER BY Relation_Id ASC`,
      [...batch, ...batch]
    );

    for (const row of rows) {
      const sourceId = Number(row.Person_Id);
      const targetId = Number(row.Related_Person_Id);

      // Both endpoints must belong to the authorized network.
      if (!authorizedIds.has(sourceId) || !authorizedIds.has(targetId)) {
        continue;
      }

      relationships.set(Number(row.Relation_Id), {
        relationId: Number(row.Relation_Id),
        personId: sourceId,
        relatedPersonId: targetId,
        relationType: row.Relation_Type,
      });
    }
  }

  return [...relationships.values()];
};

const getMyFamily = asyncHandler(async (req, res) => {
  // Family data must not be cached by browsers or intermediaries.
  res.set("Cache-Control", "no-store");

  const context = req.familyAccess;

  if (!context) {
    throw createError(
      "Family access context is missing. Ensure loadFamilyAccess runs before this controller.",
      500,
      "FAMILY_ACCESS_CONTEXT_MISSING"
    );
  }

  // Admin already has access to the existing global family-management
  // endpoints. Avoid loading the entire database into one response here.
  if (context.isGlobal) {
    return res.status(200).json({
      success: true,
      message: "Administrator has global family access",
      data: {
        access: {
          role: "Admin",
          scope: "global",
          isGlobal: true,
        },
        families: [],
        people: [],
        relationships: [],
        meta: {
          totalFamilies: 0,
          totalPeople: 0,
          totalRelationships: 0,
          useGlobalAdminEndpoints: true,
        },
      },
    });
  }

  const bloodlinePersonIds = uniquePositiveIds(context.bloodlinePersonIds);
  const spousePersonIds = uniquePositiveIds(context.spousePersonIds);
  const extendedPersonIds = uniquePositiveIds(context.extendedPersonIds);
  const bloodlineFamilyIds = uniquePositiveIds(context.bloodlineFamilyIds);
  const spouseFamilyIds = uniquePositiveIds(context.spouseFamilyIds);
  const familyIds = uniquePositiveIds(context.familyIds);

  if (!context.anchorPersonId || bloodlinePersonIds.length === 0) {
    throw createError(
      "No linked family member was found for this account.",
      403,
      "FAMILY_PERSON_NOT_LINKED"
    );
  }

  if (extendedPersonIds.length > MAX_EXTENDED_PERSONS) {
    throw createError(
      `The authorized family network contains more than ${MAX_EXTENDED_PERSONS} people. Please ask an Admin to review the family records.`,
      413,
      "EXTENDED_FAMILY_LIMIT_EXCEEDED"
    );
  }

  const extendedContext = {
    ...context,
    _bloodlineIds: new Set(bloodlinePersonIds),
    _spouseIds: new Set(spousePersonIds),
  };

  const [families, people, relationships] = await Promise.all([
    fetchFamilies(familyIds, new Set(bloodlineFamilyIds)),
    fetchPeople(extendedPersonIds, extendedContext),
    fetchAuthorizedRelationships(extendedPersonIds),
  ]);

  const linkedPerson = people.find(
    (person) => person.personId === Number(context.anchorPersonId)
  ) || null;

  return res.status(200).json({
    success: true,
    message: "Your authorized family information was retrieved successfully",
    data: {
      access: {
        role: "User",
        scope: "relationship_based",
        isGlobal: false,
        anchorPersonId: Number(context.anchorPersonId),
      },
      linkedPerson,
      families,
      people,
      relationships,
      meta: {
        totalFamilies: families.length,
        totalPeople: people.length,
        totalRelationships: relationships.length,
        bloodlinePeople: bloodlinePersonIds.length,
        spouses: spousePersonIds.length,
        bloodlineFamilies: bloodlineFamilyIds.length,
        spouseFamilies: spouseFamilyIds.length,
      },
    },
  });
});

module.exports = {
  getMyFamily,
};
