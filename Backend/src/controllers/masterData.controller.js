
const masterDataService = require("../services/masterData.service");
const asyncHandler = require("../utils/asyncHandler");

const getAllMasterData = asyncHandler(async (req, res) => {
  const { type } = req.params;

  const result = await masterDataService.getAllMasterData(type);

  return res.status(200).json({
    success: true,
    message: "Master data retrieved successfully",
    data: result,
  });
});

const getMasterDataById = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  const result = await masterDataService.getMasterDataById(
    type,
    id
  );

  return res.status(200).json({
    success: true,
    message: "Master record retrieved successfully",
    data: result,
  });
});

const createMasterData = asyncHandler(async (req, res) => {
  const { type } = req.params;

  const result = await masterDataService.createMasterData(
    type,
    req.body
  );

  return res.status(201).json({
    success: true,
    message: "Master record created successfully",
    data: result,
  });
});

const updateMasterData = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  const result = await masterDataService.updateMasterData(
    type,
    id,
    req.body
  );

  return res.status(200).json({
    success: true,
    message: "Master record updated successfully",
    data: result,
  });
});

const deleteMasterData = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  const result = await masterDataService.deleteMasterData(
    type,
    id
  );

  return res.status(200).json({
    success: true,
    message: "Master record deleted successfully",
    data: result,
  });
});

module.exports = {
  getAllMasterData,
  getMasterDataById,
  createMasterData,
  updateMasterData,
  deleteMasterData,
};
