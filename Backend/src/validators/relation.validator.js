
const ALLOWED_RELATIONS = [
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Husband-Wife",
  "Wife-Husband",
];

// ======================================================
// COMMON VALIDATION HELPERS
// ======================================================

const isValidId = (value) => {
  if (
    (typeof value !== "number" &&
      typeof value !== "string") ||
    String(value).trim() === ""
  ) {
    return false;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0;
};

const sendValidationError = (
  res,
  message,
  extra = {}
) => {
  return res.status(400).json({
    success: false,
    message,
    ...extra,
  });
};

const validateRequestBody = (req, res) => {
  if (
    !req.body ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    sendValidationError(
      res,
      "Request body must be a JSON object"
    );

    return false;
  }

  return true;
};

const validateRelationType = (
  relationType,
  res
) => {
  if (
    typeof relationType !== "string" ||
    !ALLOWED_RELATIONS.includes(relationType)
  ) {
    sendValidationError(
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

// ======================================================
// 1. VALIDATE CREATE RELATIONSHIP
// POST /persons/:personId/relations
// ======================================================

const validateCreateRelation = (
  req,
  res,
  next
) => {
  if (!validateRequestBody(req, res)) {
    return;
  }

  const { personId } = req.params;

  const {
    relatedPersonId,
    relationType,
  } = req.body;

  // Validate source person ID.
  if (!isValidId(personId)) {
    return sendValidationError(
      res,
      "personId in the URL must be a valid positive integer"
    );
  }

  // Validate related person ID.
  if (!isValidId(relatedPersonId)) {
    return sendValidationError(
      res,
      "relatedPersonId must be a valid positive integer"
    );
  }

  // Validate relationship type.
  if (!validateRelationType(relationType, res)) {
    return;
  }

  // Prevent self-relationship.
  if (
    Number(personId) === Number(relatedPersonId)
  ) {
    return sendValidationError(
      res,
      "A person cannot be related to themselves"
    );
  }

  return next();
};

// ======================================================
// 2. VALIDATE UPDATE RELATIONSHIP
// PUT /relations/:relationId
// ======================================================

const validateUpdateRelation = (
  req,
  res,
  next
) => {
  if (!validateRequestBody(req, res)) {
    return;
  }

  const { relationId } = req.params;

  const {
    personId,
    relatedPersonId,
    relationType,
  } = req.body;

  // Validate relationship ID.
  if (!isValidId(relationId)) {
    return sendValidationError(
      res,
      "relationId in the URL must be a valid positive integer"
    );
  }

  // Validate source person ID.
  if (!isValidId(personId)) {
    return sendValidationError(
      res,
      "personId must be a valid positive integer"
    );
  }

  // Validate related person ID.
  if (!isValidId(relatedPersonId)) {
    return sendValidationError(
      res,
      "relatedPersonId must be a valid positive integer"
    );
  }

  // Validate relationship type.
  if (!validateRelationType(relationType, res)) {
    return;
  }

  // Prevent self-relationship.
  if (
    Number(personId) === Number(relatedPersonId)
  ) {
    return sendValidationError(
      res,
      "A person cannot be related to themselves"
    );
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
