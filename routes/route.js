const express = require("express");
const router = express.Router();
const {
  login,
  registerUser,
  registerAdmin,
  verifyAdminOTP,
  forgotPassword,
  resetPassword,
  handleGoogleLogin,
} = require("../controllers/appController.js");
const { registerMail } = require("../controllers/mailer.js");
const { body, validationResult } = require("express-validator");

// Define routes without error handling
router.route("/register").post(registerUser);
router.route("/registerAdmin").post(registerAdmin);
router.route("/registerMail").post(registerMail);
router.route("/login").post(login);
router.route("/forgot-password").post(forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/verifyAdminOTP", verifyAdminOTP);
router.post("/google-login", handleGoogleLogin);

module.exports = router;
