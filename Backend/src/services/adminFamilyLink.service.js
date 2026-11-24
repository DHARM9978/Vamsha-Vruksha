
const db = require("../config/db");
const logger = require("../utils/logger");

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;

const createError = (
  message,
  statusCode = 400,
  code = "ADMIN_FAMILY_LINK_ERROR"
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const parsePositiveId = (value, fieldName) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError(
      `${fieldName} must be a valid positive integer`,
      400,
      "INVALID_INPUT"
    );
  }

  return id;
};

const parsePagination = ({ page, pageSize } = {}) => {
  const parsedPage = page === undefined
    ? DEFAULT_PAGE
    : Number.parseInt(page, 10);

  const parsedPageSize = pageSize === undefined
    ? DEFAULT_PAGE_SIZE
    : Number.parseInt(pageSize, 10);

  if (
    !Number.isSafeInteger(parsedPage) ||
    parsedPage < 1 ||
    !Number.isSafeInteger(parsedPageSize) ||
    parsedPageSize < 1
  ) {
    throw createError(
      "Page and pageSize must be positive integers",
      400,
      "INVALID_PAGINATION"
    );
  }

  return {
    page: parsedPage,
    pageSize: Math.min(parsedPageSize, MAX_PAGE_SIZE),
    offset: (parsedPage - 1) * Math.min(parsedPageSize, MAX_PAGE_SIZE),
  };
};

const normalizeEmail = (value) =>
  typeof value === "string"
    ? value.trim().toLowerCase()
    : "";

const normalizeSearch = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw createError(
      "Search term must be text",
      400,
      "INVALID_SEARCH"
    );
  }

  const search = value.trim();

  if (search.length > MAX_SEARCH_LENGTH) {
    throw createError(
      `Search term cannot exceed ${MAX_SEARCH_LENGTH} characters`,
      400,
      "INVALID_SEARCH"
    );
  }

  return search;
};

const escapeLike = (value) =>
  value.replace(/[\\%_]/g, "\\$&");

const rollbackSafely = async (connection) => {
  try {
    await connection.rollback();
  } catch (error) {
    logger.error("Admin family-link transaction rollback failed", {
      errorCode: error.code || null,
    });
  }
};

// ======================================================
// VERIFY ADMIN FOR READ-ONLY OPERATIONS
// ======================================================

const ensureActiveAdmin = async (adminId) => {
  const id = parsePositiveId(adminId, "adminId");

  const [rows] = await db.execute(
    `SELECT user_id
     FROM user_login
     WHERE user_id = ?
       AND role = 'Admin'
       AND is_verified = 1
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    throw createError(
      "A verified Admin account is required for this operation",
      403,
      "ADMIN_ACCESS_REQUIRED"
    );
  }

  return id;
};

// ======================================================
// VERIFY ADMIN WITHIN A TRANSACTION
// ======================================================

const assertActiveAdmin = async (connection, adminId) => {
  const [rows] = await connection.execute(
    `SELECT user_id
     FROM user_login
     WHERE user_id = ?
       AND role = 'Admin'
       AND is_verified = 1
     LIMIT 1
     FOR UPDATE`,
    [adminId]
  );

  if (rows.length === 0) {
    throw createError(
      "A verified Admin account is required for this operation",
      403,
      "ADMIN_ACCESS_REQUIRED"
    );
  }
};

// ======================================================
// LIST VERIFIED USER ACCOUNTS THAT ARE NOT LINKED
// ======================================================

const listUnlinkedUserAccounts = async (options = {}) => {
  await ensureActiveAdmin(options.adminId);

  const { page, pageSize, offset } = parsePagination(options);
  const search = normalizeSearch(options.search);

  const where = [
    "u.role = 'User'",
    "u.is_verified = 1",
    "upl.user_id IS NULL",
  ];

  const params = [];

  if (search) {
    const pattern = `%${escapeLike(search)}%`;

    where.push(
      "(u.user_name LIKE ? ESCAPE '\\\\' OR u.user_email LIKE ? ESCAPE '\\\\')"
    );

    params.push(pattern, pattern);
  }

  const whereSql = where.join(" AND ");

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM user_login u
     LEFT JOIN user_person_link upl
       ON upl.user_id = u.user_id
     WHERE ${whereSql}`,
    params
  );

  const [rows] = await db.execute(
    `SELECT
       u.user_id AS userId,
       u.user_name AS userName,
       u.user_email AS email,
       u.created_at AS createdAt,

       (
         SELECT COUNT(*)
         FROM person p
         WHERE p.Email IS NOT NULL
           AND TRIM(p.Email) <> ''
           AND LOWER(TRIM(p.Email)) = LOWER(TRIM(u.user_email))
       ) AS personMatchCount

     FROM user_login u

     LEFT JOIN user_person_link upl
       ON upl.user_id = u.user_id

     WHERE ${whereSql}

     ORDER BY u.created_at ASC, u.user_id ASC

     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const accounts = rows.map((row) => {
    const matchCount = Number(row.personMatchCount);

    return {
      userId: Number(row.userId),
      userName: row.userName,
      email: row.email,
      createdAt: row.createdAt,
      personMatchCount: matchCount,

      matchStatus:
        matchCount === 0
          ? "unmatched"
          : matchCount === 1
            ? "unique_candidate"
            : "ambiguous",
    };
  });

  return {
    accounts,
    pagination: {
      page,
      pageSize,
      total: Number(countRows[0]?.total || 0),
      totalPages: Math.ceil(
        Number(countRows[0]?.total || 0) / pageSize
      ),
    },
  };
};

// ======================================================
// SEARCH PEOPLE FOR ADMIN ACCOUNT LINKING
// ======================================================

const searchPeopleForLinking = async (options = {}) => {
  await ensureActiveAdmin(options.adminId);

  const { page, pageSize, offset } = parsePagination(options);
  const search = normalizeSearch(options.search);

  const familyId =
    options.familyId === undefined ||
    options.familyId === null ||
    options.familyId === ""
      ? null
      : parsePositiveId(options.familyId, "familyId");

  if (!search && !familyId) {
    throw createError(
      "Provide a search term or a family ID",
      400,
      "SEARCH_CRITERIA_REQUIRED"
    );
  }

  const where = [
    "p.Family_Id IS NOT NULL",
  ];

  const params = [];

  if (familyId) {
    where.push("p.Family_Id = ?");
    params.push(familyId);
  }

  if (search) {
    const pattern = `%${escapeLike(search)}%`;

    const searchConditions = [
      "p.First_Name LIKE ? ESCAPE '\\\\'",
      "p.Last_Name LIKE ? ESCAPE '\\\\'",
      "CONCAT_WS(' ', p.First_Name, p.Last_Name) LIKE ? ESCAPE '\\\\'",
      "p.father_name LIKE ? ESCAPE '\\\\'",
      "p.mother_name LIKE ? ESCAPE '\\\\'",
      "f.Family_Name LIKE ? ESCAPE '\\\\'",
      "p.Email LIKE ? ESCAPE '\\\\'",
    ];

    const searchParams = searchConditions.map(() => pattern);

    if (/^[0-9]+$/.test(search)) {
      searchConditions.push("p.Person_Id = ?");
      searchParams.push(Number(search));
    }

    where.push(`(${searchConditions.join(" OR ")})`);
    params.push(...searchParams);
  }

  const whereSql = where.join(" AND ");

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM person p

     INNER JOIN family f
       ON f.Family_Id = p.Family_Id

     WHERE ${whereSql}`,
    params
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
       p.Email AS email,
       p.Original_Native AS originalNative,

       f.Family_Name AS familyName,

       (
         SELECT COUNT(*)
         FROM person same_email

         WHERE p.Email IS NOT NULL
           AND TRIM(p.Email) <> ''
           AND LOWER(TRIM(same_email.Email)) = LOWER(TRIM(p.Email))

       ) AS duplicateEmailCount,

       EXISTS (
         SELECT 1
         FROM user_person_link upl
         WHERE upl.person_id = p.Person_Id
       ) AS alreadyLinked

     FROM person p

     INNER JOIN family f
       ON f.Family_Id = p.Family_Id

     WHERE ${whereSql}

     ORDER BY
       f.Family_Name ASC,
       p.First_Name ASC,
       p.Person_Id ASC

     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const people = rows.map((row) => ({
    personId: Number(row.personId),
    familyId: Number(row.familyId),

    firstName: row.firstName,
    lastName: row.lastName,

    fullName: [row.firstName, row.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || `Person ${row.personId}`,

    fatherName: row.fatherName,
    motherName: row.motherName,
    gender: row.gender,
    dob: row.dob,
    email: row.email,
    originalNative: row.originalNative,
    familyName: row.familyName,

    duplicateEmailCount: Number(row.duplicateEmailCount),
    alreadyLinked: Boolean(row.alreadyLinked),
  }));

  return {
    people,
    pagination: {
      page,
      pageSize,
      total: Number(countRows[0]?.total || 0),
      totalPages: Math.ceil(
        Number(countRows[0]?.total || 0) / pageSize
      ),
    },
  };
};

// ======================================================
// LINK A VERIFIED USER ACCOUNT TO ONE PERSON RECORD
// ======================================================

const linkUserToPerson = async ({
  adminId,
  userId,
  personId,
  confirmEmailMismatch = false,
}) => {
  const actingAdminId = parsePositiveId(adminId, "adminId");
  const targetUserId = parsePositiveId(userId, "userId");
  const targetPersonId = parsePositiveId(personId, "personId");

  if (actingAdminId === targetUserId) {
    throw createError(
      "An Admin account cannot be linked through this User-linking operation",
      400,
      "INVALID_LINK_TARGET"
    );
  }

  if (typeof confirmEmailMismatch !== "boolean") {
    throw createError(
      "confirmEmailMismatch must be a boolean",
      400,
      "INVALID_CONFIRMATION"
    );
  }

  const connection = await db.getConnection();

  let emailMismatch = false;

  try {
    await connection.beginTransaction();

    await assertActiveAdmin(connection, actingAdminId);

    const [userRows] = await connection.execute(
      `SELECT
         user_id,
         user_email,
         role,
         is_verified
       FROM user_login
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [targetUserId]
    );

    if (userRows.length === 0) {
      throw createError(
        "User account was not found",
        404,
        "USER_NOT_FOUND"
      );
    }

    const user = userRows[0];

    if (user.role !== "User") {
      throw createError(
        "Only ordinary User accounts can be linked to a family person",
        400,
        "INVALID_USER_ROLE"
      );
    }

    if (Number(user.is_verified) !== 1) {
      throw createError(
        "The User account must be email-verified before family linking",
        403,
        "USER_NOT_VERIFIED"
      );
    }

    const [personRows] = await connection.execute(
      `SELECT
         Person_Id,
         Family_Id,
         Email
       FROM person
       WHERE Person_Id = ?
       LIMIT 1
       FOR UPDATE`,
      [targetPersonId]
    );

    if (personRows.length === 0) {
      throw createError(
        "Family person was not found",
        404,
        "PERSON_NOT_FOUND"
      );
    }

    const person = personRows[0];

    if (!person.Family_Id) {
      throw createError(
        "The selected person must be assigned to a family before linking",
        409,
        "PERSON_NOT_ASSIGNED_TO_FAMILY"
      );
    }

    emailMismatch =
      normalizeEmail(user.user_email) !==
      normalizeEmail(person.Email);

    if (emailMismatch && !confirmEmailMismatch) {
      throw createError(
        "The account email does not match the selected person's email. Confirm the mismatch explicitly before linking.",
        409,
        "EMAIL_MISMATCH_CONFIRMATION_REQUIRED"
      );
    }

    const [existingUserLinks] = await connection.execute(
      `SELECT user_id, person_id
       FROM user_person_link
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [targetUserId]
    );

    if (existingUserLinks.length > 0) {
      throw createError(
        "This User account is already linked to a person",
        409,
        "USER_ALREADY_LINKED"
      );
    }

    const [existingPersonLinks] = await connection.execute(
      `SELECT user_id, person_id
       FROM user_person_link
       WHERE person_id = ?
       LIMIT 1
       FOR UPDATE`,
      [targetPersonId]
    );

    if (existingPersonLinks.length > 0) {
      throw createError(
        "This person is already linked to another login account",
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
       VALUES (?, ?, ?, 'admin_manual')`,
      [
        targetUserId,
        targetPersonId,
        actingAdminId,
      ]
    );

    await connection.commit();

  } catch (error) {
    await rollbackSafely(connection);

    if (error.code === "ER_DUP_ENTRY") {
      throw createError(
        "The account or person was linked by another request. Refresh the records and try again.",
        409,
        "PERSON_LINK_CONFLICT"
      );
    }

    throw error;

  } finally {
    connection.release();
  }

  logger.info("Admin linked User account to family person", {
    adminId: actingAdminId,
    userId: targetUserId,
    personId: targetPersonId,
    emailMismatch,
    linkMethod: "admin_manual",
  });

  return {
    userId: targetUserId,
    personId: targetPersonId,
    linkMethod: "admin_manual",
    emailMismatch,
    linkedByUserId: actingAdminId,
  };
};

// ======================================================
// GET LINK STATUS FOR A USER ACCOUNT
// ======================================================

const getUserPersonLink = async (adminId, userId) => {
  await ensureActiveAdmin(adminId);

  const targetUserId = parsePositiveId(userId, "userId");

  const [rows] = await db.execute(
    `SELECT
       upl.user_id AS userId,
       upl.person_id AS personId,
       upl.link_method AS linkMethod,
       upl.linked_by_user_id AS linkedByUserId,
       upl.created_at AS linkedAt,
       p.Family_Id AS familyId,
       p.First_Name AS firstName,
       p.Last_Name AS lastName,
       f.Family_Name AS familyName

     FROM user_person_link upl

     INNER JOIN person p
       ON p.Person_Id = upl.person_id

     LEFT JOIN family f
       ON f.Family_Id = p.Family_Id

     WHERE upl.user_id = ?
     LIMIT 1`,
    [targetUserId]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  return {
    userId: Number(row.userId),
    personId: Number(row.personId),
    linkMethod: row.linkMethod,

    linkedByUserId: row.linkedByUserId == null
      ? null
      : Number(row.linkedByUserId),

    linkedAt: row.linkedAt,

    familyId: row.familyId == null
      ? null
      : Number(row.familyId),

    personName: [row.firstName, row.lastName]
      .filter(Boolean)
      .join(" ")
      .trim(),

    familyName: row.familyName,
  };
};

// ======================================================
// EXPORT SERVICE
// ======================================================

module.exports = {
  listUnlinkedUserAccounts,
  searchPeopleForLinking,
  linkUserToPerson,
  getUserPersonLink,
};
