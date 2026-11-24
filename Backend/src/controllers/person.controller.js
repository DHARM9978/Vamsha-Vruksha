
const personService = require("../services/person.service");
const asyncHandler = require("../utils/asyncHandler");

// Family access must be loaded by the route middleware before
// calling any person-read controller.
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

// ADD PERSON TO FAMILY — Admin only

const addPersonToFamily = asyncHandler(async (req, res) => {
  const person = await personService.addPersonToFamily(
    req.params.familyId,
    req.body
  );

  setPrivateResponseHeaders(res);

  return res.status(201).json({
    success: true,
    message: "Person added to family successfully",
    data: { person },
  });
});

// GET PEOPLE BY FAMILY ID

const getPeopleByFamilyId = asyncHandler(async (req, res) => {
  const accessContext = requireFamilyAccessContext(req);

  const people = await personService.getPeopleByFamilyId(
    req.params.familyId,
    {
      accessContext,
    }
  );

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Family members retrieved successfully",
    data: {
      totalMembers: people.length,
      people,
    },
  });
});

// GET PERSON BY ID

const getPersonById = asyncHandler(async (req, res) => {
  const accessContext = requireFamilyAccessContext(req);

  const person = await personService.getPersonById(
    req.params.personId,
    {
      accessContext,
    }
  );

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Person details retrieved successfully",
    data: { person },
  });
});

// UPDATE PERSON — Admin only

const updatePerson = asyncHandler(async (req, res) => {
  const person = await personService.updatePerson(
    req.params.personId,
    req.body
  );

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Person updated successfully",
    data: { person },
  });
});

// DELETE PERSON — Admin only

const deletePerson = asyncHandler(async (req, res) => {
  const result = await personService.deletePerson(
    req.params.personId
  );

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
    data: {
      personId: result.personId,
      familyId: result.familyId,
    },
  });
});

module.exports = {
  addPersonToFamily,
  getPeopleByFamilyId,
  getPersonById,
  updatePerson,
  deletePerson,
};
