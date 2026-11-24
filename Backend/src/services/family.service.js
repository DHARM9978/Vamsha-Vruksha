const db = require("../config/db");

// ==========================================
// CONFIGURATION
// ==========================================

// ==========================================
// SHARED HELPERS
// ==========================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const nullableText = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim() || null;
};

const nullableId = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(`${fieldName} must be a positive integer`);
  }

  return id;
};

const validateDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw createError(`${fieldName} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createError(`${fieldName} is not a valid date`);
  }

  return value;
};

const rollbackSafely = async (connection) => {
  try {
    await connection.rollback();
  } catch (error) {
    // Preserve the original error.
  }
};

// ==========================================
// REFERENCE ID VALIDATION
// ==========================================

const validateUniqueReferenceId = async (
  connection,
  referenceId,
  excludeFamilyId = null
) => {
  // Reference IDs are optional. Only check uniqueness when one was supplied.
  if (referenceId === null || referenceId === undefined) {
    return;
  }

  let query = `
    SELECT Family_Id
    FROM family
    WHERE Reference_Id = ?
  `;

  const params = [referenceId];

  if (excludeFamilyId !== null) {
    query += " AND Family_Id <> ?";
    params.push(excludeFamilyId);
  }

  query += " LIMIT 1 FOR UPDATE";

  const [existingFamilies] = await connection.execute(
    query,
    params
  );

  if (existingFamilies.length > 0) {
    throw createError(
      "Reference ID already exists.",
      409
    );
  }
};

// ==========================================
// MASTER DATA VALIDATION
// ==========================================

const validateMasterId = async (
  connection,
  tableName,
  idColumn,
  id,
  fieldName
) => {
  if (id === null) return;

  // Table and column names are internal constants.
  // They are never taken from request parameters.
  const [rows] = await connection.execute(
    `SELECT \`${idColumn}\`
     FROM \`${tableName}\`
     WHERE \`${idColumn}\` = ?
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    throw createError(`${fieldName} does not exist`);
  }
};

// ==========================================
// FAMILY AND PERSON MASTER REFERENCES
// ==========================================

const validateFamilyAndPersonReferences = async (
  connection,
  family,
  headPerson
) => {
  const gotraId = family.gotraId ?? headPerson.gotraId;

  if (gotraId === null) {
    throw createError("Please select Gotra.");
  }

  await validateMasterId(
    connection,
    "gothra",
    "Gotra_Id",
    gotraId,
    "Gotra ID"
  );

  const masterReferences = [
    [
      "sutra",
      "Sutra_Id",
      headPerson.sutraId,
      "Sutra ID"
    ],
    [
      "panchang_sudhi",
      "Panchang_Sudhi_Id",
      headPerson.panchangSudhiId,
      "Panchang Sudhi ID"
    ],
    [
      "vamsha",
      "Vamsha_Id",
      headPerson.vamshaId,
      "Vamsha ID"
    ],
    [
      "mane_devru",
      "Mane_Devru_Id",
      headPerson.maneDevruId,
      "Mane Devru ID"
    ],
    [
      "kula_devatha",
      "Kula_Devatha_Id",
      headPerson.kulaDevathaId,
      "Kula Devatha ID"
    ],
    [
      "pooja_vruksha",
      "Pooja_Vruksha_Id",
      headPerson.poojaVrukshaId,
      "Pooja Vruksha ID"
    ]
  ];

  for (const [table, column, id, label] of masterReferences) {
    await validateMasterId(
      connection,
      table,
      column,
      id,
      label
    );
  }

  return gotraId;
};

// ==========================================
// NORMALIZE FAMILY INPUT
// ==========================================

const normalizeFamilyInput = (input = {}) => {
  const familyName = nullableText(input.familyName);

  if (!familyName) {
    throw createError("Family name is required");
  }

  if (familyName.length > 255) {
    throw createError(
      "Family name cannot exceed 255 characters"
    );
  }

  // Reference ID is optional. The database column accepts NULL.
  const referenceId = nullableId(
    input.referenceId,
    "Reference ID"
  );

  return {
    referenceId,
    familyName,
    nativePlace: nullableText(input.nativePlace),
    headDob: validateDate(input.headDob, "Head DOB"),
    gotraId: nullableId(input.gotraId, "Gotra ID")
  };
};

// ==========================================
// CONTACT FIELD VALIDATION
// ==========================================

const isValidPhoneNumber = (value) => {
  if (!value) return true;
  if (!/^\+?[0-9][0-9\s().-]*$/.test(value)) return false;

  const digitCount = value.replace(/\D/g, "").length;
  return digitCount >= 6 && digitCount <= 15;
};

const isValidIndianMobileNumber = (value) => {
  return !value || /^[6-9]\d{9}$/.test(value);
};

const isValidEmail = (value) => {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

// ==========================================
// NORMALIZE HEAD PERSON INPUT
// ==========================================

const normalizeHeadPersonInput = (input = {}) => {
  const firstName = nullableText(input.firstName);

  if (!firstName) {
    throw createError(
      "Head person's first name is required"
    );
  }

  const gender = nullableText(input.gender);

  if (gender && gender.length > 20) {
    throw createError("Gender cannot exceed 20 characters");
  }

  const phoneNumber = nullableText(input.phoneNumber);
  const mobileNumber = nullableText(input.mobileNumber);
  const email = nullableText(input.email)?.toLowerCase() ?? null;

  if (phoneNumber && phoneNumber.length > 20) {
    throw createError(
      "Phone number cannot exceed 20 characters"
    );
  }

  if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
    throw createError(
      "Enter a valid phone number containing 6–15 digits"
    );
  }

  if (mobileNumber && mobileNumber.length > 20) {
    throw createError(
      "Mobile number cannot exceed 20 characters"
    );
  }

  if (mobileNumber && !isValidIndianMobileNumber(mobileNumber)) {
    throw createError(
      "Enter a valid 10-digit Indian mobile number starting with 6–9"
    );
  }

  if (email && email.length > 255) {
    throw createError("Email cannot exceed 255 characters");
  }

  if (email && !isValidEmail(email)) {
    throw createError("Enter a valid email address");
  }

  return {
    firstName,
    lastName: nullableText(input.lastName),
    fatherName: nullableText(input.fatherName),
    motherName: nullableText(input.motherName),
    gender,
    dob: validateDate(input.dob, "Head person's DOB"),
    phoneNumber,
    mobileNumber,
    email,
    originalNative: nullableText(input.originalNative),
    currentAddress: nullableText(input.currentAddress),
    gotraId: nullableId(input.gotraId, "Person Gotra ID"),
    sutraId: nullableId(input.sutraId, "Sutra ID"),
    panchangSudhiId: nullableId(
      input.panchangSudhiId,
      "Panchang Sudhi ID"
    ),
    vamshaId: nullableId(input.vamshaId, "Vamsha ID"),
    maneDevruId: nullableId(
      input.maneDevruId,
      "Mane Devru ID"
    ),
    kulaDevathaId: nullableId(
      input.kulaDevathaId,
      "Kula Devatha ID"
    ),
    poojaVrukshaId: nullableId(
      input.poojaVrukshaId,
      "Pooja Vruksha ID"
    )
  };
};

// ==========================================
// INSERT INITIAL HEAD PERSON
// ==========================================

const insertHeadPerson = async (
  connection,
  familyId,
  person,
  familyGotraId
) => {
  const gotraId = person.gotraId ?? familyGotraId;

  await connection.execute(
    `INSERT INTO person (
      Family_Id,
      First_Name,
      Last_Name,
      father_name,
      mother_name,
      Gender,
      DOB,
      Phone_Number,
      Mobile_Number,
      Email,
      Original_Native,
      Current_Address,
      Gotra_Id,
      Sutra_Id,
      Panchang_Sudhi_Id,
      Vamsha_Id,
      Mane_Devru_Id,
      Kula_Devatha_Id,
      Pooja_Vruksha_Id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      familyId,
      person.firstName,
      person.lastName,
      person.fatherName,
      person.motherName,
      person.gender,
      person.dob,
      person.phoneNumber,
      person.mobileNumber,
      person.email,
      person.originalNative,
      person.currentAddress,
      gotraId,
      person.sutraId,
      person.panchangSudhiId,
      person.vamshaId,
      person.maneDevruId,
      person.kulaDevathaId,
      person.poojaVrukshaId
    ]
  );
};

// ==========================================
// 1. CREATE FAMILY + INITIAL HEAD PERSON
// ==========================================

const createFamily = async ({
  family,
  headPerson
}) => {
  const normalizedFamily = normalizeFamilyInput(family);
  const normalizedPerson = normalizeHeadPersonInput(headPerson);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Prevent duplicate Reference IDs.
    await validateUniqueReferenceId(
      connection,
      normalizedFamily.referenceId
    );

    // Validate Gotra and other cultural master references.
    const gotraId = await validateFamilyAndPersonReferences(
      connection,
      normalizedFamily,
      normalizedPerson
    );

    // Insert family.
    const [familyResult] = await connection.execute(
      `INSERT INTO family (
        Reference_Id,
        Family_Name,
        Native_Place,
        Head_DOB,
        Gotra_Id
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        normalizedFamily.referenceId,
        normalizedFamily.familyName,
        normalizedFamily.nativePlace,
        normalizedFamily.headDob,
        gotraId
      ]
    );

    const familyId = familyResult.insertId;

    // Insert the initial head person in the same transaction.
    await insertHeadPerson(
      connection,
      familyId,
      normalizedPerson,
      gotraId
    );

    await connection.commit();

    return await getFamilyByIdInternal(familyId, true);

  } catch (error) {
    await rollbackSafely(connection);
    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// FAMILY READ AUTHORIZATION HELPERS
// ==========================================

const normalizeReadAccess = (accessContext) => {
  if (!accessContext || typeof accessContext !== "object") {
    throw createError(
      "Family access context is required for family reads.",
      500
    );
  }

  if (accessContext.role === "Admin" && accessContext.isGlobal === true) {
    return {
      isGlobal: true,
      familyIds: null,
      personIds: null
    };
  }

  if (accessContext.role !== "User" || accessContext.isGlobal === true) {
    throw createError(
      "A valid family access context is required.",
      403
    );
  }

  const familyIds = [
    ...new Set(
      (Array.isArray(accessContext.familyIds) ? accessContext.familyIds : [])
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && id > 0)
    )
  ];

  const personIds = [
    ...new Set(
      (Array.isArray(accessContext.extendedPersonIds)
        ? accessContext.extendedPersonIds
        : [])
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && id > 0)
    )
  ];

  return {
    isGlobal: false,
    familyIds,
    personIds
  };
};

const createPlaceholders = (count) =>
  Array.from({ length: count }, () => "?").join(",");

const FAMILY_READ_BATCH_SIZE = 500;

// ==========================================
// INTERNAL GET FAMILY BY ID
// ==========================================

const getFamilyByIdInternal = async (familyId, includePrivate) => {
  const id = nullableId(familyId, "Family ID");

  if (!id) {
    throw createError("Valid family ID is required");
  }

  const [families] = await db.execute(
    `SELECT
       f.Family_Id AS familyId,
       f.Reference_Id AS referenceId,
       f.Family_Name AS familyName,
       f.Native_Place AS nativePlace,
       f.Head_DOB AS headDob,
       f.Gotra_Id AS gotraId,
       g.Gotra_Name AS gotraName,
       f.Created_At AS createdAt
     FROM family f
     LEFT JOIN gothra g
       ON g.Gotra_Id = f.Gotra_Id
     WHERE f.Family_Id = ?
     LIMIT 1`,
    [id]
  );

  if (families.length === 0) {
    throw createError("Family not found", 404);
  }

  // Admin can retain the original head-person fields.
  // Ordinary Users receive only non-confidential fields.
  const headPersonSelect = includePrivate
    ? `
       Person_Id AS personId,
       First_Name AS firstName,
       Last_Name AS lastName,
       father_name AS fatherName,
       mother_name AS motherName,
       Gender AS gender,
       DOB AS dob,
       Phone_Number AS phoneNumber,
       Mobile_Number AS mobileNumber,
       Email AS email,
       Original_Native AS originalNative,
       Current_Address AS currentAddress,
       Gotra_Id AS gotraId,
       Sutra_Id AS sutraId,
       Panchang_Sudhi_Id AS panchangSudhiId,
       Vamsha_Id AS vamshaId,
       Mane_Devru_Id AS maneDevruId,
       Kula_Devatha_Id AS kulaDevathaId,
       Pooja_Vruksha_Id AS poojaVrukshaId
    `
    : `
       Person_Id AS personId,
       First_Name AS firstName,
       Last_Name AS lastName,
       father_name AS fatherName,
       mother_name AS motherName,
       Gender AS gender,
       DOB AS dob,
       Original_Native AS originalNative,
       Gotra_Id AS gotraId,
       Sutra_Id AS sutraId,
       Panchang_Sudhi_Id AS panchangSudhiId,
       Vamsha_Id AS vamshaId,
       Mane_Devru_Id AS maneDevruId,
       Kula_Devatha_Id AS kulaDevathaId,
       Pooja_Vruksha_Id AS poojaVrukshaId
    `;

  const [headPeople] = await db.execute(
    `SELECT ${headPersonSelect}
     FROM person
     WHERE Family_Id = ?
     ORDER BY Person_Id ASC
     LIMIT 1`,
    [id]
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS totalMembers
     FROM person
     WHERE Family_Id = ?`,
    [id]
  );

  return {
    ...families[0],
    totalMembers: Number(countRows[0].totalMembers),
    headPerson: headPeople[0] || null
  };
};

// ==========================================
// 2. GET ALL FAMILIES
// ==========================================

const getAllFamilies = async ({ accessContext } = {}) => {
  const access = normalizeReadAccess(accessContext);

  if (access.isGlobal) {
    const [families] = await db.execute(
      `SELECT
         f.Family_Id AS familyId,
         f.Reference_Id AS referenceId,
         f.Family_Name AS familyName,
         f.Native_Place AS nativePlace,
         f.Head_DOB AS headDob,
         f.Gotra_Id AS gotraId,
         g.Gotra_Name AS gotraName,
         f.Created_At AS createdAt,
         (
           SELECT COUNT(*)
           FROM person p
           WHERE p.Family_Id = f.Family_Id
         ) AS totalMembers,
         (
           SELECT CONCAT_WS(' ', hp.First_Name, hp.Last_Name)
           FROM person hp
           WHERE hp.Family_Id = f.Family_Id
           ORDER BY hp.Person_Id ASC
           LIMIT 1
         ) AS headPersonName
       FROM family f
       LEFT JOIN gothra g
         ON g.Gotra_Id = f.Gotra_Id
       ORDER BY f.Family_Id DESC`
    );

    return families;
  }

  if (access.familyIds.length === 0) {
    return [];
  }

  const resultById = new Map();

  for (
    let index = 0;
    index < access.familyIds.length;
    index += FAMILY_READ_BATCH_SIZE
  ) {
    const batch = access.familyIds.slice(
      index,
      index + FAMILY_READ_BATCH_SIZE
    );

    const [families] = await db.execute(
      `SELECT
         f.Family_Id AS familyId,
         f.Reference_Id AS referenceId,
         f.Family_Name AS familyName,
         f.Native_Place AS nativePlace,
         f.Head_DOB AS headDob,
         f.Gotra_Id AS gotraId,
         g.Gotra_Name AS gotraName,
         f.Created_At AS createdAt,
         (
           SELECT COUNT(*)
           FROM person p
           WHERE p.Family_Id = f.Family_Id
         ) AS totalMembers,
         (
           SELECT CONCAT_WS(' ', hp.First_Name, hp.Last_Name)
           FROM person hp
           WHERE hp.Family_Id = f.Family_Id
           ORDER BY hp.Person_Id ASC
           LIMIT 1
         ) AS headPersonName
       FROM family f
       LEFT JOIN gothra g
         ON g.Gotra_Id = f.Gotra_Id
       WHERE f.Family_Id IN (${createPlaceholders(batch.length)})
       ORDER BY f.Family_Id DESC`,
      batch
    );

    for (const family of families) {
      resultById.set(Number(family.familyId), family);
    }
  }

  return [...resultById.values()].sort(
    (a, b) => Number(b.familyId) - Number(a.familyId)
  );
};

// ==========================================
// 3. GET FAMILY BY ID
// ==========================================

const getFamilyById = async (familyId, { accessContext } = {}) => {
  const id = nullableId(familyId, "Family ID");

  if (!id) {
    throw createError("Valid family ID is required");
  }

  const access = normalizeReadAccess(accessContext);

  if (!access.isGlobal) {
    if (!access.familyIds.includes(id)) {
      // Do not disclose whether an unrelated family exists.
      throw createError("Family not found", 404);
    }
  }

  const family = await getFamilyByIdInternal(
    id,
    access.isGlobal
  );

  if (!access.isGlobal && family.headPerson) {
    const headPersonId = Number(family.headPerson.personId);

    // The entire family ID is authorized, but only expose a
    // head-person profile if that person is part of the computed
    // extended-person scope.
    if (!access.personIds.includes(headPersonId)) {
      family.headPerson = null;
    }
  }

  return family;
};

// ==========================================
// 4. UPDATE FAMILY + INITIAL HEAD PERSON
// ==========================================

const updateFamily = async ({
  familyId,
  family,
  headPerson
}) => {
  const id = nullableId(familyId, "Family ID");

  if (!id) {
    throw createError("Valid family ID is required");
  }

  const normalizedFamily = normalizeFamilyInput(family);
  const normalizedPerson = normalizeHeadPersonInput(headPerson);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock and verify the family.
    const [existingFamilies] = await connection.execute(
      `SELECT Family_Id
       FROM family
       WHERE Family_Id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (existingFamilies.length === 0) {
      throw createError("Family not found", 404);
    }

    // Check duplicate Reference ID, excluding this family.
    await validateUniqueReferenceId(
      connection,
      normalizedFamily.referenceId,
      id
    );

    // Preserve the existing family-head convention.
    const [headPeople] = await connection.execute(
      `SELECT Person_Id
       FROM person
       WHERE Family_Id = ?
       ORDER BY Person_Id ASC
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (headPeople.length === 0) {
      throw createError(
        "This family has no initial person to update. Add a person first.",
        409
      );
    }

    const gotraId = await validateFamilyAndPersonReferences(
      connection,
      normalizedFamily,
      normalizedPerson
    );

    // Update family information.
    await connection.execute(
      `UPDATE family
       SET
         Reference_Id = ?,
         Family_Name = ?,
         Native_Place = ?,
         Head_DOB = ?,
         Gotra_Id = ?
       WHERE Family_Id = ?`,
      [
        normalizedFamily.referenceId,
        normalizedFamily.familyName,
        normalizedFamily.nativePlace,
        normalizedFamily.headDob,
        gotraId,
        id
      ]
    );

    // Update the initial head person.
    const headPersonId = headPeople[0].Person_Id;
    const personGotraId = normalizedPerson.gotraId ?? gotraId;

    await connection.execute(
      `UPDATE person
       SET
         First_Name = ?,
         Last_Name = ?,
         father_name = ?,
         mother_name = ?,
         Gender = ?,
         DOB = ?,
         Phone_Number = ?,
         Mobile_Number = ?,
         Email = ?,
         Original_Native = ?,
         Current_Address = ?,
         Gotra_Id = ?,
         Sutra_Id = ?,
         Panchang_Sudhi_Id = ?,
         Vamsha_Id = ?,
         Mane_Devru_Id = ?,
         Kula_Devatha_Id = ?,
         Pooja_Vruksha_Id = ?
       WHERE Person_Id = ?
         AND Family_Id = ?`,
      [
        normalizedPerson.firstName,
        normalizedPerson.lastName,
        normalizedPerson.fatherName,
        normalizedPerson.motherName,
        normalizedPerson.gender,
        normalizedPerson.dob,
        normalizedPerson.phoneNumber,
        normalizedPerson.mobileNumber,
        normalizedPerson.email,
        normalizedPerson.originalNative,
        normalizedPerson.currentAddress,
        personGotraId,
        normalizedPerson.sutraId,
        normalizedPerson.panchangSudhiId,
        normalizedPerson.vamshaId,
        normalizedPerson.maneDevruId,
        normalizedPerson.kulaDevathaId,
        normalizedPerson.poojaVrukshaId,
        headPersonId,
        id
      ]
    );

    await connection.commit();

    return await getFamilyByIdInternal(id, true);

  } catch (error) {
    await rollbackSafely(connection);
    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// 5. DELETE FAMILY AND ASSOCIATED RECORDS
// ==========================================

const deleteFamily = async (familyId) => {
  const id = nullableId(familyId, "Family ID");

  if (!id) {
    throw createError("Valid family ID is required");
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [families] = await connection.execute(
      `SELECT Family_Id
       FROM family
       WHERE Family_Id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (families.length === 0) {
      throw createError("Family not found", 404);
    }

    // Remove relationships where either person belongs
    // to this family. This also handles cross-family
    // spouse relationships.
    await connection.execute(
      `DELETE FROM family_relation
       WHERE Person_Id IN (
         SELECT Person_Id
         FROM person
         WHERE Family_Id = ?
       )
       OR Related_Person_Id IN (
         SELECT Person_Id
         FROM person
         WHERE Family_Id = ?
       )`,
      [id, id]
    );

    // Delete family members.
    await connection.execute(
      `DELETE FROM person
       WHERE Family_Id = ?`,
      [id]
    );

    // Delete family record.
    await connection.execute(
      `DELETE FROM family
       WHERE Family_Id = ?`,
      [id]
    );

    await connection.commit();

    return {
      familyId: id,
      message:
        "Family and its associated people and relations deleted successfully"
    };

  } catch (error) {
    await rollbackSafely(connection);
    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// EXPORT FAMILY SERVICES
// ==========================================

module.exports = {
  createFamily,
  getAllFamilies,
  getFamilyById,
  updateFamily,
  deleteFamily
};