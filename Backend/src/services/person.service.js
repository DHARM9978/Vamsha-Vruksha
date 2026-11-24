const db = require("../config/db");

// ==========================================
// MASTER TABLE CONFIGURATION
// ==========================================

const MASTER_TABLES = {
  gotraId: {
    table: "gothra",
    column: "Gotra_Id"
  },
  sutraId: {
    table: "sutra",
    column: "Sutra_Id"
  },
  panchangSudhiId: {
    table: "panchang_sudhi",
    column: "Panchang_Sudhi_Id"
  },
  vamshaId: {
    table: "vamsha",
    column: "Vamsha_Id"
  },
  maneDevruId: {
    table: "mane_devru",
    column: "Mane_Devru_Id"
  },
  kulaDevathaId: {
    table: "kula_devatha",
    column: "Kula_Devatha_Id"
  },
  poojaVrukshaId: {
    table: "pooja_vruksha",
    column: "Pooja_Vruksha_Id"
  }
};

// ==========================================
// PERSON FIELD MAPPING
// ==========================================

const PERSON_FIELDS = {
  firstName: "First_Name",
  lastName: "Last_Name",
  fatherName: "father_name",
  motherName: "mother_name",
  gender: "Gender",
  dob: "DOB",
  phoneNumber: "Phone_Number",
  mobileNumber: "Mobile_Number",
  email: "Email",
  originalNative: "Original_Native",
  currentAddress: "Current_Address",
  gotraId: "Gotra_Id",
  sutraId: "Sutra_Id",
  panchangSudhiId: "Panchang_Sudhi_Id",
  vamshaId: "Vamsha_Id",
  maneDevruId: "Mane_Devru_Id",
  kulaDevathaId: "Kula_Devatha_Id",
  poojaVrukshaId: "Pooja_Vruksha_Id"
};

// ==========================================
// COMMON HELPERS
// ==========================================

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

const normalizeText = (
  value,
  fieldName,
  maxLength = 255
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw createError(
      `${fieldName} must be a string`
    );
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw createError(
      `${fieldName} cannot exceed ${maxLength} characters`
    );
  }

  return normalized || null;
};

const normalizeDate = (value, fieldName) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw createError(
      `${fieldName} must use YYYY-MM-DD format`
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createError(
      `${fieldName} is not a valid date`
    );
  }

  return value;
};

const normalizeMasterId = (value, fieldName) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return parsePositiveId(value, fieldName);
};

const rollbackSafely = async (connection) => {
  try {
    await connection.rollback();
  } catch (error) {
    // Preserve the original error.
  }
};

// ==========================================
// NORMALIZE PERSON INPUT
// ==========================================

const normalizePersonInput = (input) => {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw createError(
      "A valid person object is required"
    );
  }

  const person = {
    firstName: normalizeText(
      input.firstName,
      "firstName",
      100
    ),

    lastName: normalizeText(
      input.lastName,
      "lastName",
      100
    ),

    fatherName: normalizeText(
      input.fatherName,
      "fatherName",
      150
    ),

    motherName: normalizeText(
      input.motherName,
      "motherName",
      150
    ),

    gender: normalizeText(
      input.gender,
      "gender",
      20
    ),

    dob: normalizeDate(
      input.dob,
      "dob"
    ),

    phoneNumber: normalizeText(
      input.phoneNumber,
      "phoneNumber",
      15
    ),

    mobileNumber: normalizeText(
      input.mobileNumber,
      "mobileNumber",
      15
    ),

    email: normalizeText(
      input.email,
      "email",
      150
    ),

    originalNative: normalizeText(
      input.originalNative,
      "originalNative"
    ),

    currentAddress: normalizeText(
      input.currentAddress,
      "currentAddress"
    ),

    gotraId: normalizeMasterId(
      input.gotraId,
      "gotraId"
    ),

    sutraId: normalizeMasterId(
      input.sutraId,
      "sutraId"
    ),

    panchangSudhiId: normalizeMasterId(
      input.panchangSudhiId,
      "panchangSudhiId"
    ),

    vamshaId: normalizeMasterId(
      input.vamshaId,
      "vamshaId"
    ),

    maneDevruId: normalizeMasterId(
      input.maneDevruId,
      "maneDevruId"
    ),

    kulaDevathaId: normalizeMasterId(
      input.kulaDevathaId,
      "kulaDevathaId"
    ),

    poojaVrukshaId: normalizeMasterId(
      input.poojaVrukshaId,
      "poojaVrukshaId"
    )
  };

  if (!person.firstName) {
    throw createError("firstName is required");
  }

  // Preserve the original PHP form options.
  if (
    person.gender &&
    !["Male", "Female"].includes(person.gender)
  ) {
    throw createError(
      "Gender must be Male or Female"
    );
  }

  if (
    person.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)
  ) {
    throw createError(
      "Please provide a valid email address"
    );
  }

  return person;
};

// ==========================================
// VALIDATE FAMILY EXISTS
// ==========================================

const validateFamilyExists = async (
  connection,
  familyId
) => {
  const [rows] = await connection.execute(
    `SELECT Family_Id
     FROM family
     WHERE Family_Id = ?
     LIMIT 1
     FOR UPDATE`,
    [familyId]
  );

  if (rows.length === 0) {
    throw createError("Family not found", 404);
  }
};

// ==========================================
// VALIDATE MASTER REFERENCES
// ==========================================

const validateMasterReferences = async (
  connection,
  person
) => {
  for (const [field, config] of Object.entries(
    MASTER_TABLES
  )) {
    const id = person[field];

    if (id === null) {
      continue;
    }

    const [rows] = await connection.execute(
      `SELECT \`${config.column}\`
       FROM \`${config.table}\`
       WHERE \`${config.column}\` = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      throw createError(
        `Invalid ${field}: ${id}`
      );
    }
  }
};

// ==========================================
// PERSON READ ACCESS HELPERS
// ==========================================

const normalizePersonAccess = (accessContext) => {
  if (!accessContext || typeof accessContext !== "object") {
    throw createError(
      "Person access context is required for person reads.",
      500
    );
  }

  if (accessContext.role === "Admin" && accessContext.isGlobal === true) {
    return {
      isGlobal: true,
      personIds: null,
      familyIds: null,
    };
  }

  if (accessContext.role !== "User" || accessContext.isGlobal === true) {
    throw createError(
      "A valid family access context is required.",
      403
    );
  }

  const personIds = [
    ...new Set(
      (Array.isArray(accessContext.extendedPersonIds)
        ? accessContext.extendedPersonIds
        : [])
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && id > 0)
    ),
  ];

  const familyIds = [
    ...new Set(
      (Array.isArray(accessContext.familyIds)
        ? accessContext.familyIds
        : [])
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && id > 0)
    ),
  ];

  return {
    isGlobal: false,
    personIds,
    familyIds,
  };
};

const createPlaceholders = (count) =>
  Array.from({ length: count }, () => "?").join(",");

const PERSON_READ_BATCH_SIZE = 400;

const getPersonSelectColumns = (includePrivate) => {
  const columns = [
    "Person_Id AS personId",
    "Family_Id AS familyId",
    "First_Name AS firstName",
    "Last_Name AS lastName",
    "father_name AS fatherName",
    "mother_name AS motherName",
    "Gender AS gender",
    "DOB AS dob",
  ];

  if (includePrivate) {
    columns.push(
      "Phone_Number AS phoneNumber",
      "Mobile_Number AS mobileNumber",
      "Email AS email",
      "Current_Address AS currentAddress"
    );
  }

  columns.push(
    "Original_Native AS originalNative",
    "Gotra_Id AS gotraId",
    "Sutra_Id AS sutraId",
    "Panchang_Sudhi_Id AS panchangSudhiId",
    "Vamsha_Id AS vamshaId",
    "Mane_Devru_Id AS maneDevruId",
    "Kula_Devatha_Id AS kulaDevathaId",
    "Pooja_Vruksha_Id AS poojaVrukshaId"
  );

  return columns.join(",\n       ");
};

// Internal read used after Admin-only create/update operations.
// It is deliberately not exposed directly to ordinary User requests.
const getPersonByIdInternal = async (personId, includePrivate) => {
  const id = parsePositiveId(personId, "personId");

  const [rows] = await db.execute(
    `SELECT
       ${getPersonSelectColumns(includePrivate)}
     FROM person
     WHERE Person_Id = ?
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    throw createError("Person not found", 404);
  }

  return rows[0];
};

// ==========================================
// 1. GET PERSON BY ID
// Admin: any person, including private fields.
// User: only authorized people, without private fields.
// ==========================================

const getPersonById = async (personId, { accessContext } = {}) => {
  const id = parsePositiveId(personId, "personId");
  const access = normalizePersonAccess(accessContext);

  if (!access.isGlobal && !access.personIds.includes(id)) {
    // Do not reveal whether an unrelated person record exists.
    throw createError("Person not found", 404);
  }

  return getPersonByIdInternal(id, access.isGlobal);
};

// ==========================================
// 2. ADD PERSON TO FAMILY
// ==========================================

const addPersonToFamily = async (
  familyId,
  input
) => {
  const id = parsePositiveId(
    familyId,
    "familyId"
  );

  const person = normalizePersonInput(input);

  const connection = await db.getConnection();

  let personId;

  try {
    await connection.beginTransaction();

    // Verify family exists and lock its record.
    await validateFamilyExists(
      connection,
      id
    );

    // Validate all cultural master references.
    await validateMasterReferences(
      connection,
      person
    );

    const columns = [
      "Family_Id",
      ...Object.values(PERSON_FIELDS)
    ];

    const values = [
      id,
      ...Object.keys(PERSON_FIELDS).map(
        (key) => person[key]
      )
    ];

    const placeholders = columns
      .map(() => "?")
      .join(", ");

    const [result] = await connection.execute(
      `INSERT INTO person
       (${columns.join(", ")})
       VALUES (${placeholders})`,
      values
    );

    personId = result.insertId;

    await connection.commit();

  } catch (error) {
    await rollbackSafely(connection);
    throw error;

  } finally {
    connection.release();
  }

  return await getPersonByIdInternal(personId, true);
};

// ==========================================
// 3. GET ALL PEOPLE BY FAMILY ID
// Admin: all people in the family, including private fields.
// User: only authorized people, without private fields.
// ==========================================

const getPeopleByFamilyId = async (
  familyId,
  { accessContext } = {}
) => {
  const id = parsePositiveId(familyId, "familyId");
  const access = normalizePersonAccess(accessContext);

  if (!access.isGlobal && !access.familyIds.includes(id)) {
    throw createError("Family not found", 404);
  }

  const [familyRows] = await db.execute(
    `SELECT Family_Id
     FROM family
     WHERE Family_Id = ?
     LIMIT 1`,
    [id]
  );

  if (familyRows.length === 0) {
    throw createError("Family not found", 404);
  }

  if (!access.isGlobal && access.personIds.length === 0) {
    return [];
  }

  const peopleById = new Map();
  const batches = access.isGlobal
    ? [null]
    : Array.from(
        { length: Math.ceil(access.personIds.length / PERSON_READ_BATCH_SIZE) },
        (_, index) => access.personIds.slice(
          index * PERSON_READ_BATCH_SIZE,
          (index + 1) * PERSON_READ_BATCH_SIZE
        )
      );

  for (const batch of batches) {
    const params = [id];
    let personFilter = "";

    if (!access.isGlobal) {
      if (!batch || batch.length === 0) continue;
      personFilter = ` AND Person_Id IN (${createPlaceholders(batch.length)})`;
      params.push(...batch);
    }

    const [people] = await db.execute(
      `SELECT
         ${getPersonSelectColumns(access.isGlobal)}
       FROM person
       WHERE Family_Id = ?${personFilter}
       ORDER BY Person_Id ASC`,
      params
    );

    for (const person of people) {
      peopleById.set(Number(person.personId), person);
    }
  }

  return [...peopleById.values()].sort(
    (a, b) => Number(a.personId) - Number(b.personId)
  );
};

// ==========================================
// 4. UPDATE PERSON
// ==========================================

const updatePerson = async (
  personId,
  input
) => {
  const id = parsePositiveId(
    personId,
    "personId"
  );

  const person = normalizePersonInput(input);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock and verify person record.
    const [existingRows] = await connection.execute(
      `SELECT Person_Id
       FROM person
       WHERE Person_Id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (existingRows.length === 0) {
      throw createError("Person not found", 404);
    }

    // Validate master-data references.
    await validateMasterReferences(
      connection,
      person
    );

    const entries = Object.entries(
      PERSON_FIELDS
    );

    const setClause = entries
      .map(([, column]) => `${column} = ?`)
      .join(", ");

    const values = entries.map(
      ([field]) => person[field]
    );

    await connection.execute(
      `UPDATE person
       SET ${setClause}
       WHERE Person_Id = ?`,
      [...values, id]
    );

    await connection.commit();

  } catch (error) {
    await rollbackSafely(connection);
    throw error;

  } finally {
    connection.release();
  }

  return await getPersonByIdInternal(id, true);
};

// ==========================================
// 5. DELETE PERSON
// ==========================================

const deletePerson = async (personId) => {
  const id = parsePositiveId(
    personId,
    "personId"
  );

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock person record.
    const [people] = await connection.execute(
      `SELECT Person_Id, Family_Id
       FROM person
       WHERE Person_Id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (people.length === 0) {
      throw createError("Person not found", 404);
    }

    const familyId = Number(
      people[0].Family_Id
    );

    // Identify the earliest person in the family.
    const [headRows] = await connection.execute(
      `SELECT Person_Id
       FROM person
       WHERE Family_Id = ?
       ORDER BY Person_Id ASC
       LIMIT 1
       FOR UPDATE`,
      [familyId]
    );

    const [memberCountRows] = await connection.execute(
      `SELECT COUNT(*) AS totalMembers
       FROM person
       WHERE Family_Id = ?`,
      [familyId]
    );

    const totalMembers = Number(
      memberCountRows[0].totalMembers
    );

    const isFamilyHead =
      headRows.length > 0 &&
      Number(headRows[0].Person_Id) === id;

    // Do not delete the family head while other members exist.
    if (isFamilyHead && totalMembers > 1) {
      throw createError(
        "The family head cannot be deleted while other family members exist. Update the family-head management rules first.",
        409
      );
    }

    // Delete incoming and outgoing relationships.
    await connection.execute(
      `DELETE FROM family_relation
       WHERE Person_Id = ?
          OR Related_Person_Id = ?`,
      [id, id]
    );

    // Delete person.
    await connection.execute(
      `DELETE FROM person
       WHERE Person_Id = ?`,
      [id]
    );

    await connection.commit();

    return {
      personId: id,
      familyId,
      message:
        "Person and associated relationship records deleted successfully"
    };

  } catch (error) {
    await rollbackSafely(connection);
    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// EXPORT PERSON SERVICES
// ==========================================

module.exports = {
  addPersonToFamily,
  getPeopleByFamilyId,
  getPersonById,
  updatePerson,
  deletePerson
};