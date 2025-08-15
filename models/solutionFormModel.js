// const mongoose = require("mongoose");

// const solutionFormSchema = new mongoose.Schema({
//   solutionId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Solution", // Assuming you have a Solution model
//   },
//   fullName: { type: String }, // Can be used to store both first and last names
//   firstName: { type: String }, // Separate first name field
//   lastName: { type: String }, // Separate last name field
//   phoneNumber: { type: String },
//   email: { type: String, required: true },
//   employmentStatus: { type: String },
//   jobTitle: { type: String },
//   selectedSolution: { type: String },
//   slug: { type: String, required: true },
//   amount: { type: Number, required: true }, // Ensure amount is required
//   paymentStatus: { type: String, default: "pending" },
//   submittedAt: { type: Date, default: Date.now },
//   paymentReference: { type: String },
//   paymentMethod: { type: String },
//   paymentDate: { type: Date },
//   paymentDetails: { type: Object },

//   // New fields
//   solutionCategory: { type: String },
//   companyName: { type: String },
//   companyIndustry: { type: String },
//   companySize: { type: String },
//   country: { type: String },
//   solutionType: { type: String },
// });

// module.exports = mongoose.model("SolutionForm", solutionFormSchema);

const mongoose = require("mongoose");

const solutionFormSchema = new mongoose.Schema(
  {
    solutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Solution",
    },
    firstName: { type: String },
    lastName: { type: String },
    phoneNumber: { type: String },
    email: { type: String, required: true },
    employmentStatus: { type: String },
    jobTitle: { type: String },
    selectedSolution: { type: String },
    slug: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    submittedAt: { type: Date, default: Date.now },
    paymentReference: { type: String },
    paymentMethod: { type: String },
    paymentDate: { type: Date },
    paymentDetails: { type: Object },

    solutionType: {
      type: String,
      enum: ["consulting service", "training school"],
      required: true,
      set: function (value) {
        if (typeof value === "string") {
          return value.toLowerCase();
        }
        return value;
      },
    },

    voucherCode: { type: String, default: "" },
    finalAmount: { type: Number, default: 0 },

    companyName: { type: String },
    companyIndustry: { type: String },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+", null],
    },
    country: { type: String },
  },

  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Remove the real fullName field and keep only the virtual one
solutionFormSchema.virtual("fullName").get(function () {
  return this.firstName && this.lastName
    ? `${this.firstName} ${this.lastName}`
    : undefined;
});

// Indexes
solutionFormSchema.index({ email: 1 });
solutionFormSchema.index({ paymentStatus: 1 });
solutionFormSchema.index({ solutionType: 1 });
solutionFormSchema.index(
  { paymentReference: 1 },
  { unique: true, sparse: true }
);

// Pre-save hook
solutionFormSchema.pre("save", function (next) {
  if (this.solutionType) {
    this.solutionType = this.solutionType.toLowerCase();
  }
  next();
});

module.exports = mongoose.model("SolutionForm", solutionFormSchema);
