
const familyService = require("../services/family.service");

// ==========================================
// CREATE FAMILY
// POST /api/families
// ==========================================

const createFamily = async (req, res, next) => {
  try {
    const { family, headPerson } = req.body;

    const result = await familyService.createFamily({
      family,
      headPerson
    });

    return res.status(201).json({
      success: true,
      message: "Family and initial head person created successfully",
      data: {
        family: result
      }
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// GET ALL FAMILIES
// GET /api/families
// ==========================================

const getAllFamilies = async (req, res, next) => {
  try {
    const families = await familyService.getAllFamilies();

    return res.status(200).json({
      success: true,
      message: "Families retrieved successfully",
      data: {
        totalFamilies: families.length,
        families
      }
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// GET FAMILY BY ID
// GET /api/families/:familyId
// ==========================================

const getFamilyById = async (req, res, next) => {
  try {
    const family = await familyService.getFamilyById(
      req.params.familyId
    );

    return res.status(200).json({
      success: true,
      message: "Family details retrieved successfully",
      data: {
        family
      }
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// UPDATE FAMILY
// PUT /api/families/:familyId
// ==========================================

const updateFamily = async (req, res, next) => {
  try {
    const { family, headPerson } = req.body;

    const updatedFamily = await familyService.updateFamily({
      familyId: req.params.familyId,
      family,
      headPerson
    });

    return res.status(200).json({
      success: true,
      message: "Family updated successfully",
      data: {
        family: updatedFamily
      }
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// DELETE FAMILY
// DELETE /api/families/:familyId
// ==========================================

const deleteFamily = async (req, res, next) => {
  try {
    const result = await familyService.deleteFamily(
      req.params.familyId
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        familyId: result.familyId
      }
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createFamily,
  getAllFamilies,
  getFamilyById,
  updateFamily,
  deleteFamily
};
