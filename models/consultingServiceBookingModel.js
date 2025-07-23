const mongoose = require("mongoose");

const ConsultingServiceFormSchema = new mongoose.Schema(
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

    companyName: { type: String },
    companyIndustry: { type: String },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+", null],
    },
    country: { type: String },
    preferredDate: { type: Date }, // New field
    preferredTime: { type: String }, // New field
    message: { type: String }, // New field
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Remove the real fullName field and keep only the virtual one
ConsultingServiceFormSchema.virtual("fullName").get(function () {
  return this.firstName && this.lastName
    ? `${this.firstName} ${this.lastName}`
    : undefined;
});

// Indexes
ConsultingServiceFormSchema.index({ email: 1 });
ConsultingServiceFormSchema.index({ paymentStatus: 1 });
ConsultingServiceFormSchema.index({ solutionType: 1 });
ConsultingServiceFormSchema.index(
  { paymentReference: 1 },
  { unique: true, sparse: true }
);

// Pre-save hook
ConsultingServiceFormSchema.pre("save", function (next) {
  if (this.solutionType) {
    this.solutionType = this.solutionType.toLowerCase();
  }
  next();
});

module.exports = mongoose.model(
  "ConsultingServiceForm",
  ConsultingServiceFormSchema
);
