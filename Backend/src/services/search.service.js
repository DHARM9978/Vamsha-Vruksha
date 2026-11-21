
const db = require("../config/db");

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePagination = (query = {}) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) {
    throw createError("Page must be a positive integer", 400);
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createError("Limit must be between 1 and 100", 400);
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

const cleanSearchValue = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw createError(`${fieldName} must be a string or number`, 400);
  }

  const cleanValue = String(value).trim();

  if (cleanValue.length > 255) {
    throw createError(`${fieldName} cannot exceed 255 characters`, 400);
  }

  return cleanValue || null;
};

const parseOptionalId = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw createError(`${fieldName} must be a positive integer`, 400);
  }

  return id;
};

// Search people by name, native place, or family.
const searchPersons = async (query = {}) => {
  const { page, limit, offset } = parsePagination(query);

  const search = cleanSearchValue(query.q, "Search query");
  const firstName = cleanSearchValue(query.firstName, "First name");
  const lastName = cleanSearchValue(query.lastName, "Last name");
  const nativePlace = cleanSearchValue(query.nativePlace, "Native place");
  const familyId = parseOptionalId(query.familyId, "Family ID");

  const conditions = [];
  const params = [];

  if (search) {
    conditions.push(`(
      p.First_Name LIKE ?
      OR p.Last_Name LIKE ?
      OR CONCAT_WS(' ', p.First_Name, p.Last_Name) LIKE ?
      OR p.Original_Native LIKE ?
    )`);

    const searchValue = `%${search}%`;

    params.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  if (firstName) {
    conditions.push("p.First_Name LIKE ?");
    params.push(`%${firstName}%`);
  }

  if (lastName) {
    conditions.push("p.Last_Name LIKE ?");
    params.push(`%${lastName}%`);
  }

  if (nativePlace) {
    conditions.push("p.Original_Native LIKE ?");
    params.push(`%${nativePlace}%`);
  }

  if (familyId) {
    conditions.push("p.Family_Id = ?");
    params.push(familyId);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [countRows] = await db.execute(
    `
      SELECT COUNT(*) AS total
      FROM person p
      LEFT JOIN family f
        ON f.Family_Id = p.Family_Id
      ${whereClause}
    `,
    params
  );

  const [rows] = await db.execute(
    `
      SELECT
        p.Person_Id AS personId,
        p.First_Name AS firstName,
        p.Last_Name AS lastName,
        p.Gender AS gender,
        p.DOB AS dateOfBirth,
        p.Original_Native AS originalNative,
        p.Family_Id AS familyId,
        f.Family_Name AS familyName,
        f.Native_Place AS familyNativePlace
      FROM person p
      LEFT JOIN family f
        ON f.Family_Id = p.Family_Id
      ${whereClause}
      ORDER BY p.Person_Id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const total = Number(countRows[0].total);

  return {
    items: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

// Search and browse families by family name, native place,
// or reference ID.
const searchFamilies = async (query = {}) => {
  const { page, limit, offset } = parsePagination(query);

  const search = cleanSearchValue(query.q, "Search query");
  const familyName = cleanSearchValue(query.familyName, "Family name");
  const nativePlace = cleanSearchValue(query.nativePlace, "Native place");
  const referenceId = parseOptionalId(
    query.referenceId,
    "Reference ID"
  );

  const conditions = [];
  const params = [];

  if (search) {
    conditions.push(`(
      f.Family_Name LIKE ?
      OR f.Native_Place LIKE ?
      OR CAST(f.Reference_Id AS CHAR) LIKE ?
    )`);

    const searchValue = `%${search}%`;

    params.push(
      searchValue,
      searchValue,
      searchValue
    );
  }

  if (familyName) {
    conditions.push("f.Family_Name LIKE ?");
    params.push(`%${familyName}%`);
  }

  if (nativePlace) {
    conditions.push("f.Native_Place LIKE ?");
    params.push(`%${nativePlace}%`);
  }

  if (referenceId !== null) {
    conditions.push("f.Reference_Id = ?");
    params.push(referenceId);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [countRows] = await db.execute(
    `
      SELECT COUNT(*) AS total
      FROM family f
      ${whereClause}
    `,
    params
  );

  const [rows] = await db.execute(
    `
      SELECT
        f.Family_Id AS familyId,
        f.Reference_Id AS referenceId,
        f.Family_Name AS familyName,
        f.Native_Place AS nativePlace,
        f.Head_DOB AS headDateOfBirth,
        f.Gotra_Id AS gotraId,
        g.Gotra_Name AS gotraName,
        f.Created_At AS createdAt,
        (
          SELECT COUNT(*)
          FROM person p
          WHERE p.Family_Id = f.Family_Id
        ) AS totalPeople
      FROM family f
      LEFT JOIN gothra g
        ON g.Gotra_Id = f.Gotra_Id
      ${whereClause}
      ORDER BY f.Family_Id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const total = Number(countRows[0].total);

  return {
    items: rows.map((row) => ({
      ...row,
      totalPeople: Number(row.totalPeople),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

module.exports = {
  searchPersons,
  searchFamilies,
};
