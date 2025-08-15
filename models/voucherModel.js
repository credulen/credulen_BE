const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Voucher code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: [true, "Discount type is required"],
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    usageLimit: {
      type: Number,
      default: 0, // 0 = unlimited
      min: [0, "Usage limit cannot be negative"],
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    oncePerUser: {
      type: Boolean,
      default: false,
    },
    applicableItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Solution",
      },
    ], // Empty = all solutions
    applicableEmails: {
      type: [String], // Array of email strings
      default: [],
      validate: {
        validator: function (emails) {
          // Validate each email in the array
          return emails.every((email) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          );
        },
        message: (props) => `${props.value} contains invalid email addresses`,
      },
    },
    minCartAmount: {
      type: Number,
      default: 0,
      min: [0, "Minimum cart amount cannot be negative"],
    },
    forNewUsers: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Pre-save validation (e.g., ensure percentage <=100)
voucherSchema.pre("save", function (next) {
  if (this.discountType === "percentage" && this.discountValue > 100) {
    return next(new Error("Percentage discount cannot exceed 100"));
  }
  next();
});

const Voucher = mongoose.model("Voucher", voucherSchema);

module.exports = Voucher;
