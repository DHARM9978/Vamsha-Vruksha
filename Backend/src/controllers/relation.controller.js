
const relationService = require("../services/relation.service");
const logger = require("../utils/logger");

// ======================================================
// COMMON RESPONSE / ACCESS HELPERS
// ======================================================

const requireFamilyAccessContext = (req) => {
  if (!req.familyAccess) {
    const error = new Error(
      "Family access context is missing. Ensure loadFamilyAccess runs before this controller."
    );

    error.statusCode = 500;
    error.code = "FAMILY_ACCESS_CONTEXT_MISSING";

    throw error;
  }

  return req.familyAccess;
};

const setPrivateResponseHeaders = (res) => {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
};

// ======================================================
// 1. ADD RELATIONSHIP
// Admin-only route
// ======================================================

const addRelation = async (req, res, next) => {
  try {
    const result = await relationService.addRelation(
      req.params.personId,
      req.body
    );

    setPrivateResponseHeaders(res);

    logger.info("Relationship created successfully", {
      requestId: req.requestId,
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        relation: result,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ======================================================
// 2. GET PERSON RELATIONSHIPS
// ======================================================

const getPersonRelations = async (req, res, next) => {
  try {
    const accessContext = requireFamilyAccessContext(req);

    const relations = await relationService.getPersonRelations(
      req.params.personId,
      {
        accessContext,
      }
    );

    setPrivateResponseHeaders(res);

    logger.info("Person relationships retrieved successfully", {
      requestId: req.requestId,
      personId: Number(req.params.personId),
      totalRelations: relations.length,
    });

    return res.status(200).json({
      success: true,
      message: "Person relationships retrieved successfully",
      data: {
        totalRelations: relations.length,
        relations,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ======================================================
// 3. UPDATE RELATIONSHIP
// Admin-only route
// ======================================================

const updateRelation = async (req, res, next) => {
  try {
    const result = await relationService.updateRelation(
      req.params.relationId,
      req.body
    );

    setPrivateResponseHeaders(res);

    logger.info("Relationship updated successfully", {
      requestId: req.requestId,
      relationId: Number(req.params.relationId),
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        relation: result,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ======================================================
// 4. DELETE RELATIONSHIP
// Admin-only route
// ======================================================

const deleteRelation = async (req, res, next) => {
  try {
    const result = await relationService.deleteRelation(
      req.params.relationId
    );

    setPrivateResponseHeaders(res);

    logger.info("Relationship deleted successfully", {
      requestId: req.requestId,
      relationId: Number(req.params.relationId),
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        relationId: result.relationId,
        personId: result.personId,
        relatedPersonId: result.relatedPersonId,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {
  addRelation,
  getPersonRelations,
  updateRelation,
  deleteRelation,
};
