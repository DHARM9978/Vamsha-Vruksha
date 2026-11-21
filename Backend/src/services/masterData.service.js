
const db = require("../config/db");

const MASTER_CONFIG = {
  gotra: {
    table: "gothra",
    idColumn: "Gotra_Id",
    nameColumn: "Gotra_Name",
    references: [
      { table: "family", column: "Gotra_Id" },
      { table: "person", column: "Gotra_Id" },
    ],
  },

  sutra: {
    table: "sutra",
    idColumn: "Sutra_Id",
    nameColumn: "Sutra_Name",
    references: [
      { table: "person", column: "Sutra_Id" },
    ],
  },

  vamsha: {
    table: "vamsha",
    idColumn: "Vamsha_Id",
    nameColumn: "Vamsha_Name",
    references: [
      { table: "person", column: "Vamsha_Id" },
    ],
  },

  "kula-devatha": {
    table: "kula_devatha",
    idColumn: "Kula_Devatha_Id",
    nameColumn: "Kula_Devatha_Name",
    references: [
      { table: "person", column: "Kula_Devatha_Id" },
    ],
  },

  "mane-devru": {
    table: "mane_devru",
    idColumn: "Mane_Devru_Id",
    nameColumn: "Mane_Devru_Name",
    references: [
      { table: "person", column: "Mane_Devru_Id" },
    ],
  },

  "panchang-sudhi": {
    table: "panchang_sudhi",
    idColumn: "Panchang_Sudhi_Id",
    nameColumn: "Panchang_Sudhi_Name",
    references: [
      { table: "person", column: "Panchang_Sudhi_Id" },
    ],
  },

  "pooja-vruksha": {
    table: "pooja_vruksha",
    idColumn: "Pooja_Vruksha_Id",
    nameColumn: "Pooja_Vruksha_Name",
    references: [
      { table: "person", column: "Pooja_Vruksha_Id" },
    ],
  },
};

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getMasterConfig = (type) => {
  const config = MASTER_CONFIG[String(type || "").toLowerCase()];

  if (!config) {
    throw createError("Invalid master-data type", 400);
  }

  return config;
};

const parsePositiveId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw createError("Invalid master-data ID", 400);
  }

  return id;
};

const validateName = (name) => {
  if (typeof name !== "string" || !name.trim()) {
    throw createError("Master name is required", 400);
  }

  const cleanName = name.trim();

  if (cleanName.length > 255) {
    throw createError(
      "Master name cannot exceed 255 characters",
      400
    );
  }

  return cleanName;
};

const findById = async (config, id) => {
  const [rows] = await db.execute(
    `SELECT
       ${config.idColumn} AS id,
       ${config.nameColumn} AS name
     FROM ${config.table}
     WHERE ${config.idColumn} = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
};

const checkDuplicateName = async (
  config,
  name,
  excludeId = null
) => {
  let sql = `
    SELECT ${config.idColumn} AS id
    FROM ${config.table}
    WHERE LOWER(TRIM(${config.nameColumn})) = LOWER(TRIM(?))
  `;

  const params = [name];

  if (excludeId !== null) {
    sql += ` AND ${config.idColumn} <> ?`;
    params.push(excludeId);
  }

  sql += " LIMIT 1";

  const [rows] = await db.execute(sql, params);

  return rows.length > 0;
};

// GET all records for one master type.
const getAllMasterData = async (type) => {
  const config = getMasterConfig(type);

  const [rows] = await db.execute(
    `SELECT
       ${config.idColumn} AS id,
       ${config.nameColumn} AS name
     FROM ${config.table}
     ORDER BY ${config.nameColumn} ASC`
  );

  return rows;
};

// GET one record by ID.
const getMasterDataById = async (type, masterId) => {
  const config = getMasterConfig(type);
  const id = parsePositiveId(masterId);

  const record = await findById(config, id);

  if (!record) {
    throw createError("Master-data record not found", 404);
  }

  return record;
};

// CREATE a master record.
const createMasterData = async (type, payload) => {
  const config = getMasterConfig(type);
  const name = validateName(payload?.name);

  const duplicate = await checkDuplicateName(config, name);

  if (duplicate) {
    throw createError(
      "A master record with this name already exists",
      409
    );
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO ${config.table} (${config.nameColumn})
       VALUES (?)`,
      [name]
    );

    return {
      id: result.insertId,
      name,
    };
  } catch (error) {
    // Gotra has a unique name index in the supplied SQL dump.
    if (error.code === "ER_DUP_ENTRY") {
      throw createError(
        "A master record with this name already exists",
        409
      );
    }

    throw error;
  }
};

// UPDATE a master record.
const updateMasterData = async (type, masterId, payload) => {
  const config = getMasterConfig(type);
  const id = parsePositiveId(masterId);
  const name = validateName(payload?.name);

  const existingRecord = await findById(config, id);

  if (!existingRecord) {
    throw createError("Master-data record not found", 404);
  }

  const duplicate = await checkDuplicateName(
    config,
    name,
    id
  );

  if (duplicate) {
    throw createError(
      "Another master record with this name already exists",
      409
    );
  }

  try {
    await db.execute(
      `UPDATE ${config.table}
       SET ${config.nameColumn} = ?
       WHERE ${config.idColumn} = ?`,
      [name, id]
    );

    return {
      id,
      name,
    };
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createError(
        "A master record with this name already exists",
        409
      );
    }

    throw error;
  }
};

// DELETE a master record only when it is not referenced.
const deleteMasterData = async (type, masterId) => {
  const config = getMasterConfig(type);
  const id = parsePositiveId(masterId);

  const existingRecord = await findById(config, id);

  if (!existingRecord) {
    throw createError("Master-data record not found", 404);
  }

  // Check all referencing tables before deletion.
  for (const reference of config.references) {
    const [rows] = await db.execute(
      `SELECT 1
       FROM ${reference.table}
       WHERE ${reference.column} = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length > 0) {
      throw createError(
        `Cannot delete this record because it is being used by ${reference.table} records`,
        409
      );
    }
  }

  try {
    await db.execute(
      `DELETE FROM ${config.table}
       WHERE ${config.idColumn} = ?`,
      [id]
    );
  } catch (error) {
    // Protect against a reference being added between the
    // reference check and the delete operation.
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      throw createError(
        "Cannot delete this record because it is being used elsewhere",
        409
      );
    }

    throw error;
  }

  return {
    id,
    name: existingRecord.name,
  };
};

module.exports = {
  getAllMasterData,
  getMasterDataById,
  createMasterData,
  updateMasterData,
  deleteMasterData,
};
