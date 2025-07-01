const mongoose = require("mongoose");

const FreeClassRegistrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: true,
    },
    phoneNum: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[\d\s-]{10,}$/, "Please provide a valid phone number"],
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "FreeClassRegistration",
  FreeClassRegistrationSchema
);
