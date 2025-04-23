const express = require("express");
const router = express.Router();

const {
  verifyPaystackPayment,
  initiatePaystackPayment,
  getAllPayments,
  getPaymentByReference,
} = require("../controllers/PaymentController");

// Existing routes
router.post("/initiate-paystack-payment", initiatePaystackPayment);
router.get("/verify-paystack-payment", verifyPaystackPayment);
router.get("/getAllPayments", getAllPayments);

// Update this route to accept a URL parameter
router.get("/getPaymentByReference/:reference", getPaymentByReference);
// Changed from "/getPaymentByReference" to "/getPaymentByReference/:reference"

module.exports = router;
