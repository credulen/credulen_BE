const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide a unique email"],
      unique: true,
    },
    password: {
      type: String,
    },
    username: {
      type: String,
    },
    fullName: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    bio: {
      type: String,
    },
    agentId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Optionally, add referrals array for easier querying (reverse relation)
    referrals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    googleId: {
      type: String,
    },
    verifiedEmail: {
      type: Boolean,
    },
    picture: {
      type: String,
    },
    uniqueId: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    refreshTokens: [
      {
        token: { type: String },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
        deviceInfo: { type: String },
      },
    ],
    otp: { type: String }, // OTP field
    otpExpiresAt: { type: Date },

    image: {
      type: String, // URL of the user's profile image
    },
    role: { type: String, enum: ["admin", "user", "agent"], default: "user" },
    resetPasswordToken: { type: String }, // Field to store the reset token
    resetPasswordExpires: { type: Date },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
