// const mongoose = require("mongoose");

// const solutionFormSchema = new mongoose.Schema({
//   fullName: { type: String, required: true },
//   phoneNumber: { type: String, required: true },
//   email: { type: String, required: true },
//   employmentStatus: { type: String, required: true },
//   jobTitle: { type: String },
//   selectedSolution: { type: String, required: true },
//   slug: { type: String, required: true },
//   submittedAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model("SolutionForm", solutionFormSchema);

const mongoose = require("mongoose");

const solutionFormSchema = new mongoose.Schema({
  fullName: { type: String }, // Can be used to store both first and last names
  firstName: { type: String }, // Separate first name field
  lastName: { type: String }, // Separate last name field
  phoneNumber: { type: String },
  email: { type: String, required: true },
  employmentStatus: { type: String },
  jobTitle: { type: String },
  selectedSolution: { type: String },
  slug: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },

  // New fields
  solutionCategory: { type: String },
  companyName: { type: String },
  companyIndustry: { type: String },
  companySize: { type: String },
  country: { type: String },
  solutionType: { type: String },
});

module.exports = mongoose.model("SolutionForm", solutionFormSchema);
