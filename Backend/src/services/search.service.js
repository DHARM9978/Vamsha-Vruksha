const db = require("../config/db");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 255;
const ID_BATCH_SIZE = 500;

const createError = (message, statusCode = 400, code = "SEARCH_ERROR") => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

// ======================================================
// INPUT VALIDATION
// ======================================================

const parsePagination = (query = {}) => {
  const parseInteger = (value, fallback, fieldName) => {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    const text = String(value).trim();

    if (!/^\d+$/.test(text)) {
      throw createError(
        `${fieldName} must be a positive integer`,
        400,
        "INVALID_PAGINATION"
      );
    }

    const parsed = Number(text);

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw createError(
        `${fieldName} must be a positive integer`,
        400,
        "INVALID_PAGINATION"
      );
    }

    return parsed;
  };

  const page = parseInteger(query.page, DEFAULT_PAGE, "Page");
  const requestedLimit = parseInteger(
    query.limit,
    DEFAULT_LIMIT,
    "Limit"
  );

  if (requestedLimit > MAX_LIMIT) {
    throw createError(
      `Limit cannot exceed ${MAX_LIMIT}`,
      400,
      "INVALID_PAGINATION"
    );
  }

  const offset = (page - 1) * requestedLimit;

  if (!Number.isSafeInteger(offset)) {
    throw createError(
      "Requested page is too large",
      400,
      "INVALID_PAGINATION"
    );
  }

  return {
    page,
    limit: requestedLimit,
    offset,
  };
};

const cleanSearchValue = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw createError(
      `${fieldName} must be a string or number`,
      400,
      "INVALID_SEARCH_VALUE"
    );
  }

  const cleanValue = String(value).trim();

  if (cleanValue.length > MAX_SEARCH_LENGTH) {
    throw createError(
      `${fieldName} cannot exceed ${MAX_SEARCH_LENGTH} characters`,
      400,
      "INVALID_SEARCH_VALUE"
    );
  }

  return cleanValue || null;
};

const parseOptionalId = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const text = String(value).trim();

  if (!/^\d+$/.test(text)) {
    throw createError(
      `${fieldName} must be a positive integer`,
      400,
      "INVALID_ID"
    );
  }

  const id = Number(text);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(
      `${fieldName} must be a positive integer`,
      400,
      "INVALID_ID"
    );
  }

  return id;
};

const uniquePositiveIds = (values) => [
  ...new Set(
    (Array.isArray(values) ? values : [])
      .map(Number)
      .filter((id) => Number.isSafeInteger(id) && id > 0)
  ),
];

const placeholders = (count) =>
  Array.from({ length: count }, () => "?").join(",");

const chunks = (values, size) => {
  const result = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
};

// ======================================================
// AUTHORIZATION SCOPE
// ======================================================

const getSearchAccess = (accessContext) => {
  if (!accessContext || typeof accessContext !== "object") {
    throw createError(
      "Family access context is required for search",
      500,
      "FAMILY_ACCESS_CONTEXT_MISSING"
    );
  }

  if (
    accessContext.role === "Admin" &&
    accessContext.isGlobal === true
  ) {
    return {
      isGlobal: true,
      personIds: null,
      familyIds: null,
    };
  }

  if (
    accessContext.role !== "User" ||
    accessContext.isGlobal === true
  ) {
    throw createError(
      "A valid family access context is required",
      403,
      "INVALID_FAMILY_ACCESS_CONTEXT"
    );
  }

  return {
    isGlobal: false,
    personIds: uniquePositiveIds(accessContext.extendedPersonIds),
    familyIds: uniquePositiveIds(accessContext.familyIds),
  };
};

const emptySearchResult = ({ page, limit }) => ({
  items: [],
  pagination: {
    page,
    limit,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: page > 1,
  },
});

// ======================================================
// SEARCH PEOPLE BY NAME, NATIVE PLACE, OR FAMILY
// Admin: global search.
// User: only people in extendedPersonIds.
// ======================================================

const searchPersons = async (
  query = {},
  { accessContext } = {}
) => {
  const { page, limit, offset } = parsePagination(query);
  const access = getSearchAccess(accessContext);

  if (!access.isGlobal && access.personIds.length === 0) {
    return emptySearchResult({ page, limit });
  }

  const search = cleanSearchValue(query.q, "Search query");
  const firstName = cleanSearchValue(query.firstName, "First name");
  const lastName = cleanSearchValue(query.lastName, "Last name");
  const nativePlace = cleanSearchValue(query.nativePlace, "Native place");
  const familyId = parseOptionalId(query.familyId, "Family ID");

  // A requested family filter must also be inside the user's scope.
  if (
    !access.isGlobal &&
    familyId !== null &&
    !access.familyIds.includes(familyId)
  ) {
    return emptySearchResult({ page, limit });
  }

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

  if (familyId !== null) {
    conditions.push("p.Family_Id = ?");
    params.push(familyId);
  }

  if (!access.isGlobal) {
    // Apply the authorized-person scope in SQL, not after fetching rows.
    conditions.push(
      `p.Person_Id IN (${placeholders(access.personIds.length)})`
    );
    params.push(...access.personIds);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM person p
     LEFT JOIN family f
       ON f.Family_Id = p.Family_Id
     ${whereClause}`,
    params
  );

  const [rows] = await db.execute(
    `SELECT
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
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const total = Number(countRows[0]?.total || 0);

  return {
    items: rows.map((row) => ({
      ...row,
      personId: Number(row.personId),
      familyId: row.familyId == null ? null : Number(row.familyId),
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

// ======================================================
// SEARCH / BROWSE FAMILIES
// Admin: global search.
// User: only family IDs in the authorized scope.
// ======================================================

const searchFamilies = async (
  query = {},
  { accessContext } = {}
) => {
  const { page, limit, offset } = parsePagination(query);
  const access = getSearchAccess(accessContext);

  if (!access.isGlobal && access.familyIds.length === 0) {
    return emptySearchResult({ page, limit });
  }

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

  if (!access.isGlobal) {
    conditions.push(
      `f.Family_Id IN (${placeholders(access.familyIds.length)})`
    );
    params.push(...access.familyIds);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM family f
     ${whereClause}`,
    params
  );

  const [rows] = await db.execute(
    `SELECT
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
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const total = Number(countRows[0]?.total || 0);

  return {
    items: rows.map((row) => ({
      ...row,
      familyId: Number(row.familyId),
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