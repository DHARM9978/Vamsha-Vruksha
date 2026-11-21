
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
// 1. GET PERSON BY ID
// ==========================================

const getPersonById = async (personId) => {
  const id = parsePositiveId(
    personId,
    "personId"
  );

  const [rows] = await db.execute(
    `SELECT
       p.Person_Id AS personId,
       p.Family_Id AS familyId,
       p.First_Name AS firstName,
       p.Last_Name AS lastName,
       p.father_name AS fatherName,
       p.mother_name AS motherName,
       p.Gender AS gender,
       p.DOB AS dob,
       p.Phone_Number AS phoneNumber,
       p.Mobile_Number AS mobileNumber,
       p.Email AS email,
       p.Original_Native AS originalNative,
       p.Current_Address AS currentAddress,
       p.Gotra_Id AS gotraId,
       p.Sutra_Id AS sutraId,
       p.Panchang_Sudhi_Id AS panchangSudhiId,
       p.Vamsha_Id AS vamshaId,
       p.Mane_Devru_Id AS maneDevruId,
       p.Kula_Devatha_Id AS kulaDevathaId,
       p.Pooja_Vruksha_Id AS poojaVrukshaId
     FROM person p
     WHERE p.Person_Id = ?
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    throw createError("Person not found", 404);
  }

  return rows[0];
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

  return await getPersonById(personId);
};

// ==========================================
// 3. GET ALL PEOPLE BY FAMILY ID
// ==========================================

const getPeopleByFamilyId = async (familyId) => {
  const id = parsePositiveId(
    familyId,
    "familyId"
  );

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

  const [people] = await db.execute(
    `SELECT
       Person_Id AS personId,
       Family_Id AS familyId,
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
     FROM person
     WHERE Family_Id = ?
     ORDER BY Person_Id ASC`,
    [id]
  );

  return people;
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

  return await getPersonById(id);
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
