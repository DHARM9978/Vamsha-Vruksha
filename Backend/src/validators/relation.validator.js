const ALLOWED_RELATIONS = Object.freeze([
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Husband-Wife",
  "Wife-Husband",
]);

const CREATE_FIELDS = new Set([
  "relatedPersonId",
  "relationType",
]);

const UPDATE_FIELDS = new Set([
  "personId",
  "relatedPersonId",
  "relationType",
]);

// ======================================================
// COMMON VALIDATION HELPERS
// ======================================================

const isPlainObject = (value) => {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
};

const reject = (res, message, extra = {}) => {
  return res.status(400).json({
    success: false,
    message,
    ...extra,
  });
};

const validateRequestBody = (req, res) => {
  if (!isPlainObject(req.body)) {
    reject(
      res,
      "Request body must be a JSON object"
    );

    return false;
  }

  return true;
};

// Accept only positive safe integer values or digit-only strings.
const isValidPositiveId = (value) => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    return false;
  }

  const parsed = Number(normalized);

  return Number.isSafeInteger(parsed) && parsed > 0;
};

const validateId = (value, fieldName, res, location = "body") => {
  if (!isValidPositiveId(value)) {
    reject(
      res,
      `${fieldName} in the ${location} must be a valid positive integer`
    );

    return false;
  }

  return true;
};

const validateRelationType = (relationType, res) => {
  if (
    typeof relationType !== "string" ||
    !ALLOWED_RELATIONS.includes(relationType)
  ) {
    reject(
      res,
      "Invalid relationType",
      {
        allowedRelations: ALLOWED_RELATIONS,
      }
    );

    return false;
  }

  return true;
};

const rejectUnexpectedFields = (body, allowedFields, res) => {
  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unexpectedFields.length > 0) {
    reject(
      res,
      "Request body contains unsupported fields",
      {
        unsupportedFields: unexpectedFields,
      }
    );

    return false;
  }

  return true;
};

const validateDistinctPeople = (personId, relatedPersonId, res) => {
  if (Number(personId) === Number(relatedPersonId)) {
    reject(
      res,
      "A person cannot be related to themselves"
    );

    return false;
  }

  return true;
};

// ======================================================
// 1. VALIDATE CREATE RELATIONSHIP
// POST /persons/:personId/relations
// ======================================================

const validateCreateRelation = (req, res, next) => {
  if (!validateRequestBody(req, res)) {
    return;
  }

  if (
    !rejectUnexpectedFields(
      req.body,
      CREATE_FIELDS,
      res
    )
  ) {
    return;
  }

  const { personId } = req.params || {};
  const {
    relatedPersonId,
    relationType,
  } = req.body;

  if (
    !validateId(
      personId,
      "personId",
      res,
      "URL"
    )
  ) {
    return;
  }

  if (
    !validateId(
      relatedPersonId,
      "relatedPersonId",
      res
    )
  ) {
    return;
  }

  if (!validateRelationType(relationType, res)) {
    return;
  }

  if (
    !validateDistinctPeople(
      personId,
      relatedPersonId,
      res
    )
  ) {
    return;
  }

  return next();
};

// ======================================================
// 2. VALIDATE UPDATE RELATIONSHIP
// PUT /relations/:relationId
// ======================================================

const validateUpdateRelation = (req, res, next) => {
  if (!validateRequestBody(req, res)) {
    return;
  }

  if (
    !rejectUnexpectedFields(
      req.body,
      UPDATE_FIELDS,
      res
    )
  ) {
    return;
  }

  const { relationId } = req.params || {};
  const {
    personId,
    relatedPersonId,
    relationType,
  } = req.body;

  if (
    !validateId(
      relationId,
      "relationId",
      res,
      "URL"
    )
  ) {
    return;
  }

  if (
    !validateId(
      personId,
      "personId",
      res
    )
  ) {
    return;
  }

  if (
    !validateId(
      relatedPersonId,
      "relatedPersonId",
      res
    )
  ) {
    return;
  }

  if (!validateRelationType(relationType, res)) {
    return;
  }

  if (
    !validateDistinctPeople(
      personId,
      relatedPersonId,
      res
    )
  ) {
    return;
  }

  return next();
};

// ======================================================
// EXPORT VALIDATORS
// ======================================================

module.exports = {
  validateCreateRelation,
  validateUpdateRelation,
};