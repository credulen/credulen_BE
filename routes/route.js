const express = require("express");
const router = express.Router();
const {
  register,
  verifyUser,
  login,
  registerUser,
  registerAdmin,
  generateOTP,
  verifyOTP,
  createResetSession,
  updateUser,
  resetPassword,
  verifAdminyOTP,
} = require("../controllers/appController.js");
const { registerMail } = require("../controllers/mailer.js");
const { body, validationResult } = require("express-validator");

// Define routes without error handling
router.route("/register").post(registerUser);
router.route("/registerAdmin").post(registerAdmin);
router.route("/registerMail").post(registerMail);
router.route("/authenticate").post(verifyUser, (req, res) => res.end());
router.route("/login").post(login);
router.post("/generateOTP", generateOTP);
router.route("/verifyOTP").get(verifyUser, verifyOTP);
router.route("/createResetSession").get(createResetSession);
router.route("/resetPassword").all(resetPassword);
router.route("/verify-otp").get(verifAdminyOTP);

module.exports = router;
