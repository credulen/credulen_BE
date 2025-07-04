const express = require("express");
const router = express.Router();
const {
  initiateWebinarPayment,
  verifyWebinarPayment,
  getWebinarBySlug,
} = require("../controllers/webinarPaymentController");

router.post("/initiate-webinar-payment", initiateWebinarPayment);
router.get("/verify-webinar-payment", verifyWebinarPayment);
router.get("/webinar/:slug", getWebinarBySlug);

module.exports = router;
