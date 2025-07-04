const mongoose = require("mongoose");

const webinarPaymentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    webinarTitle: {
      type: String,
      required: [true, "Webinar title is required"],
      trim: true,
    },
    webinarSlug: {
      type: String,
      required: [true, "Webinar slug is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank", "ussd", "mobile_money", null],
      default: null,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries on paymentReference and webinarSlug
webinarPaymentSchema.index({ paymentReference: 1 });
// webinarPaymentSchema.index({ webinarSlug: 1 });

module.exports = mongoose.model("WebinarPayment", webinarPaymentSchema);
