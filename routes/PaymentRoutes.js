const express = require("express");
const router = express.Router();

const {
  verifyPaystackPayment,
  initiatePaystackPayment,
  getAllPayments,
  getPaymentByReference,
  getDiscountedAmount,
} = require("../controllers/PaymentController");

// Existing routes
router.post("/initiate-paystack-payment", initiatePaystackPayment);
router.get("/verify-paystack-payment", verifyPaystackPayment);
router.get("/getAllPayments", getAllPayments);
router.post("/getDiscountedAmount", getDiscountedAmount);

// Update this route to accept a URL parameter
router.get("/getPaymentByReference/:reference", getPaymentByReference);
// Changed from "/getPaymentByReference" to "/getPaymentByReference/:reference"

module.exports = router;
