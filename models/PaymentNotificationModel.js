const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  recipients: {
    type: [String],
    required: true,
    default: [],
    // Valid recipient types: specific user IDs or 'admin'
    validate: {
      validator: function (v) {
        return v.length > 0;
      },
      message: "At least one recipient is required",
    },
  },
  relatedData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  type: {
    type: String,
    enum: [
      // Status types
      "success",
      "error",
      "info",
      "warning",
    ],
    required: true,
  },

  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ "relatedData.requestId": 1 });

// Update timestamps on save
notificationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const PaymentNotification = mongoose.model(
  "PaymentNotification",
  notificationSchema
);
module.exports = PaymentNotification;
