const isObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const reject = (res, message) => {
  return res.status(400).json({
    success: false,
    message,
  });
};

const validateBody = (req, res) => {
  if (!isObject(req.body)) {
    reject(res, "Request body must be a valid JSON object");
    return false;
  }

  return true;
};

const isValidPositiveInteger = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0;
};

const isValidDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const isOptionalText = (value, maxLength = Infinity) => {
  return (
    value === undefined ||
    value === null ||
    (
      typeof value === "string" &&
      value.length <= maxLength
    )
  );
};

const validateOptionalId = (value, fieldName, res) => {
  if (
    value === undefined ||
    value === null
  ) {
    return true;
  }

  if (!isValidPositiveInteger(value)) {
    reject(res, `${fieldName} must be a positive integer`);
    return false;
  }

  return true;
};

const validateFamilyPayload = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { family, headPerson } = req.body;

  // Both objects are required by the family service.
  if (!isObject(family)) {
    return reject(
      res,
      "Family details must be provided as a valid object"
    );
  }

  if (!isObject(headPerson)) {
    return reject(
      res,
      "Head person details must be provided as a valid object"
    );
  }

  // ====================================================
  // FAMILY VALIDATION
  // ====================================================

  if (
    typeof family.familyName !== "string" ||
    !family.familyName.trim() ||
    family.familyName.trim().length > 255
  ) {
    return reject(
      res,
      "Family name is required and cannot exceed 255 characters"
    );
  }

  const hasReferenceId =
    family.referenceId !== undefined &&
    family.referenceId !== null &&
    family.referenceId !== "";

  if (hasReferenceId && !isValidPositiveInteger(family.referenceId)) {
    return reject(
      res,
      "Reference ID must be a positive integer when provided"
    );
  }

  if (!isOptionalText(family.nativePlace, 255)) {
    return reject(
      res,
      "Native place must be a string with a maximum of 255 characters"
    );
  }

  if (!isValidDate(family.headDob)) {
    return reject(
      res,
      "Head DOB must be a valid date in YYYY-MM-DD format"
    );
  }

  if (
    !validateOptionalId(
      family.gotraId,
      "Family Gotra ID",
      res
    )
  ) {
    return;
  }

  // ====================================================
  // HEAD PERSON VALIDATION
  // ====================================================

  if (
    typeof headPerson.firstName !== "string" ||
    !headPerson.firstName.trim()
  ) {
    return reject(
      res,
      "Head person's first name is required"
    );
  }

  if (!isOptionalText(headPerson.lastName)) {
    return reject(res, "Last name must be a string");
  }

  if (!isOptionalText(headPerson.fatherName)) {
    return reject(res, "Father name must be a string");
  }

  if (!isOptionalText(headPerson.motherName)) {
    return reject(res, "Mother name must be a string");
  }

  if (!isOptionalText(headPerson.gender, 20)) {
    return reject(
      res,
      "Gender must be a string with a maximum of 20 characters"
    );
  }

  if (!isValidDate(headPerson.dob)) {
    return reject(
      res,
      "Head person's DOB must be a valid date in YYYY-MM-DD format"
    );
  }

  if (!isOptionalText(headPerson.phoneNumber, 20)) {
    return reject(
      res,
      "Phone number cannot exceed 20 characters"
    );
  }

  if (
    typeof headPerson.phoneNumber === "string" &&
    headPerson.phoneNumber.trim()
  ) {
    const phone = headPerson.phoneNumber.trim();
    const digits = phone.replace(/\D/g, "");

    if (!/^\+?[0-9][0-9\s().-]*$/.test(phone) || digits.length < 6 || digits.length > 15) {
      return reject(
        res,
        "Enter a valid phone number containing 6–15 digits"
      );
    }
  }

  if (!isOptionalText(headPerson.mobileNumber, 20)) {
    return reject(
      res,
      "Mobile number cannot exceed 20 characters"
    );
  }

  if (
    typeof headPerson.mobileNumber === "string" &&
    headPerson.mobileNumber.trim() &&
    !/^[6-9]\d{9}$/.test(headPerson.mobileNumber.trim())
  ) {
    return reject(
      res,
      "Enter a valid 10-digit Indian mobile number starting with 6–9"
    );
  }

  if (!isOptionalText(headPerson.email, 255)) {
    return reject(
      res,
      "Email cannot exceed 255 characters"
    );
  }

  if (
    typeof headPerson.email === "string" &&
    headPerson.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(headPerson.email.trim())
  ) {
    return reject(res, "Enter a valid email address");
  }

  if (!isOptionalText(headPerson.originalNative)) {
    return reject(res, "Original native must be a string");
  }

  if (!isOptionalText(headPerson.currentAddress)) {
    return reject(res, "Current address must be a string");
  }

  // ====================================================
  // CULTURAL MASTER ID VALIDATION
  // ====================================================

  const personMasterIds = [
    ["gotraId", "Person Gotra ID"],
    ["sutraId", "Sutra ID"],
    ["panchangSudhiId", "Panchang Sudhi ID"],
    ["vamshaId", "Vamsha ID"],
    ["maneDevruId", "Mane Devru ID"],
    ["kulaDevathaId", "Kula Devatha ID"],
    ["poojaVrukshaId", "Pooja Vruksha ID"],
  ];

  for (const [field, label] of personMasterIds) {
    if (
      !validateOptionalId(
        headPerson[field],
        label,
        res
      )
    ) {
      return;
    }
  }

  // Gotra is required either at family level or person level.
  const familyGotra = family.gotraId;
  const personGotra = headPerson.gotraId;

  if (
    (familyGotra === undefined || familyGotra === null) &&
    (personGotra === undefined || personGotra === null)
  ) {
    return reject(
      res,
      "Please select Gotra for the family or head person"
    );
  }

  next();
};

module.exports = {
  validateFamilyPayload,
};