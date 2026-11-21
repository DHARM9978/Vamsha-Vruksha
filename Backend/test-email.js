
require("dotenv").config();

const {
  verifyEmailConnection
} = require("./src/utils/email");

async function testEmail() {
  try {
    await verifyEmailConnection();

    console.log("SUCCESS: Backend SMTP authentication completed.");
  } catch (error) {
    console.error("FAILED: Backend SMTP authentication failed.");
    console.error(error.message);

    process.exitCode = 1;
  }
}

testEmail();
