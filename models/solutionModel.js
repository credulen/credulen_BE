// const mongoose = require("mongoose");

// const solutionSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: [true, "Solution title is required"],
//       unique: true,
//       trim: true,
//       minlength: [3, "Title must be at least 3 characters long"],
//       maxlength: [100, "Title cannot exceed 100 characters"],
//     },
//     content: {
//       type: String,
//       required: [true, "Solution content is required"],
//       trim: true,
//     },
//     category: {
//       type: String,
//       default: "Uncategorized",
//     },
//     trainingDesc: {
//       type: String,
//       default: "",
//       trim: true,
//     },
//     price: {
//       type: Number,
//       required: [true, "Price is required"],
//       min: [0, "Price cannot be negative"],
//       default: 0,
//     },
//     amount: { type: Number, required: true }, // Ensure amount is required
//     paymentStatus: { type: String, default: "pending" },
//     paymentMethod: { type: String, default: "" },
//     paymentReference: { type: String, default: "" },
//     slug: {
//       type: String,
//       required: [true, "Slug is required"],
//       unique: true,
//       lowercase: true,
//       trim: true,
//       match: [
//         /^[a-z0-9-]+$/,
//         "Slug can only contain lowercase letters, numbers, and hyphens",
//       ],
//     },
//     image: {
//       type: String,
//       default: null,
//       validate: {
//         validator: function (v) {
//           return (
//             v === null || /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif))$/i.test(v)
//           );
//         },
//         message:
//           "Image must be a valid URL ending in .png, .jpg, .jpeg, or .gif",
//       },
//     },
//     status: {
//       type: String,
//       enum: ["draft", "published", "archived"],
//       default: "draft",
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       // Removed required: [true, "Creator is required"]
//     },
//   },
//   {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//   }
// );

// // Indexes for better query performance
// solutionSchema.index({ slug: 1 });
// solutionSchema.index({ category: 1 });
// solutionSchema.index({ price: 1 });

// // Virtual for registrations
// solutionSchema.virtual("registrations", {
//   ref: "SolutionForm",
//   localField: "_id",
//   foreignField: "solutionId",
// });

// // Pre-save middleware to ensure consistency
// solutionSchema.pre("save", function (next) {
//   if (this.price === 0 && this.category === "TrainingSchools") {
//     this.status = "published"; // Free trainings can be auto-published
//   }
//   if (!this.trainingDesc && this.category === "TrainingSchools") {
//     this.trainingDesc = this.content.substring(0, 200); // Default description from content
//   }
//   next();
// });

// // Static method to find by slug with validation
// solutionSchema.statics.findBySlug = async function (slug) {
//   const solution = await this.findOne({ slug, isActive: true }).populate(
//     "createdBy",
//     "firstName lastName email"
//   );
//   if (!solution) {
//     throw new Error("No active solution found with this slug");
//   }
//   return solution;
// };

// const Solution = mongoose.model("Solution", solutionSchema);

// module.exports = Solution;
const mongoose = require("mongoose");

const solutionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Solution title is required"],
      unique: true,
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    content: {
      type: String,
      required: [true, "Solution content is required"],
      trim: true,
    },
    category: {
      type: String,
      default: "Uncategorized",
    },
    trainingDesc: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      default: 0,
    },
    amount: { type: Number }, // Removed required: true to allow updates without explicit amount
    discountPercentage: {
      type: Number,
      default: 0, // No discount by default
      validate: {
        validator: function (v) {
          return v >= 0 && v <= 100;
        },
        message: "Discount percentage must be between 0 and 100",
      },
    },
    paymentStatus: { type: String, default: "pending" },
    paymentMethod: { type: String, default: "" },
    paymentReference: { type: String, default: "" },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9-]+$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      ],
    },
    image: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          return (
            v === null || /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif))$/i.test(v)
          );
        },
        message:
          "Image must be a valid URL ending in .png, .jpg, .jpeg, or .gif",
      },
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // isAllLevels: { type: String, default: "Designed for All Levels" },
    // isExpertLed: { type: String, default: "Expert-Led Content" },
    // duration: { type: String, default: "3 Weeks Duration" },
    // isOnline: { type: String, default: "100% Online Learning" },
    isAllLevels: { type: String, default: "Designed for All Levels" },
    isExpertLed: { type: String, default: "Expert-Led Content" },
    duration: { type: String, default: "Duration Not Stated" },
    isOnline: { type: String, default: "Mode of Learning Not Stated" },
    prerequisites: {
      type: String,
      default: "Basic knowledge of programming recommended",
    }, // Generalized default
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save middleware to apply dynamic discount for all solutions
solutionSchema.pre("save", function (next) {
  if (this.isModified("price") || this.isModified("discountPercentage")) {
    if (this.discountPercentage > 0) {
      const discountMultiplier = 1 - this.discountPercentage / 100;
      this.amount = this.price * discountMultiplier; // Apply dynamic discount to all solutions
    } else {
      this.amount = this.price; // No discount if discountPercentage is 0
    }
  }
  if (this.price === 0) {
    this.status = "published"; // Free solutions auto-published
  }
  if (!this.trainingDesc) {
    this.trainingDesc = this.content.substring(0, 200); // Default description
  }
  next();
});

// Indexes and virtuals remain unchanged
solutionSchema.index({ slug: 1 });
solutionSchema.index({ category: 1 });
solutionSchema.index({ price: 1 });

solutionSchema.virtual("registrations", {
  ref: "SolutionForm",
  localField: "_id",
  foreignField: "solutionId",
});

solutionSchema.statics.findBySlug = async function (slug) {
  const solution = await this.findOne({ slug, isActive: true }).populate(
    "createdBy",
    "firstName lastName email"
  );
  if (!solution) {
    throw new Error("No active solution found with this slug");
  }
  return solution;
};

const Solution = mongoose.model("Solution", solutionSchema);

module.exports = Solution;
