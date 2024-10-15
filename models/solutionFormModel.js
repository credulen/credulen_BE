const mongoose = require("mongoose");

const solutionFormSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  employmentStatus: { type: String, required: true },
  jobTitle: { type: String },
  selectedSolution: { type: String, required: true },
  slug: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SolutionForm", solutionFormSchema);
