const mongoose = require("mongoose");

const processedPaymentSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true,
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: "0s" }, // TTL index to auto-delete after expiry
  },
});

module.exports = mongoose.model("ProcessedPayment", processedPaymentSchema);
