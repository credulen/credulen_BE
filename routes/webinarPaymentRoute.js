const express = require("express");
const router = express.Router();
const {
  initiateWebinarPayment,
  verifyWebinarPayment,
  getWebinarBySlug,
  getAllWebinarPayments,
  deleteWebinarPayment,
} = require("../controllers/webinarPaymentController");

router.post("/initiate-webinar-payment", initiateWebinarPayment);
router.get("/verify-webinar-payment", verifyWebinarPayment);
router.get("/webinar/:slug", getWebinarBySlug);
router.get("/getAllWebinarPayments", getAllWebinarPayments);
router.delete("/deleteWebinarPayment/:id", deleteWebinarPayment);

module.exports = router;
