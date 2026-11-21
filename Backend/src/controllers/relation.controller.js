
const relationService = require("../services/relation.service");
const logger = require("../utils/logger");

// ======================================================
// 1. ADD RELATIONSHIP
// POST /api/relations/persons/:personId/relations
// ======================================================

const addRelation = async (req, res, next) => {
  try {
    const result = await relationService.addRelation(
      req.params.personId,
      req.body
    );

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
    next(error);
  }
};

// ======================================================
// 2. GET PERSON RELATIONSHIPS
// GET /api/relations/persons/:personId/relations
// ======================================================

const getPersonRelations = async (req, res, next) => {
  try {
    const relations = await relationService.getPersonRelations(
      req.params.personId
    );

    logger.info("Person relationships retrieved successfully", {
      requestId: req.requestId,
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
    next(error);
  }
};

// ======================================================
// 3. UPDATE RELATIONSHIP
// PUT /api/relations/relations/:relationId
// ======================================================

const updateRelation = async (req, res, next) => {
  try {
    const result = await relationService.updateRelation(
      req.params.relationId,
      req.body
    );

    logger.info("Relationship updated successfully", {
      requestId: req.requestId,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        relation: result,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// 4. DELETE RELATIONSHIP
// DELETE /api/relations/relations/:relationId
// ======================================================

const deleteRelation = async (req, res, next) => {
  try {
    const result = await relationService.deleteRelation(
      req.params.relationId
    );

    logger.info("Relationship deleted successfully", {
      requestId: req.requestId,
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
    next(error);
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
