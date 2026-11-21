const personService = require("../services/person.service");

const addPersonToFamily = async (req, res, next) => {
  try {
    const person = await personService.addPersonToFamily(
      req.params.familyId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Person added to family successfully",
      data: { person },
    });
  } catch (error) {
    next(error);
  }
};

const getPeopleByFamilyId = async (req, res, next) => {
  try {
    const people = await personService.getPeopleByFamilyId(
      req.params.familyId
    );

    return res.status(200).json({
      success: true,
      message: "Family members retrieved successfully",
      data: {
        totalMembers: people.length,
        people,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPersonById = async (req, res, next) => {
  try {
    const person = await personService.getPersonById(req.params.personId);

    return res.status(200).json({
      success: true,
      message: "Person details retrieved successfully",
      data: { person },
    });
  } catch (error) {
    next(error);
  }
};

const updatePerson = async (req, res, next) => {
  try {
    const person = await personService.updatePerson(
      req.params.personId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Person updated successfully",
      data: { person },
    });
  } catch (error) {
    next(error);
  }
};

const deletePerson = async (req, res, next) => {
  try {
    const result = await personService.deletePerson(req.params.personId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        personId: result.personId,
        familyId: result.familyId,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addPersonToFamily,
  getPeopleByFamilyId,
  getPersonById,
  updatePerson,
  deletePerson,
};