const mongoose = require("mongoose");

const eventRegistrationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String, // For WhatsApp or other mobile number
    required: true,
  },
  countryOfResidence: {
    type: String,
    required: true,
  },
  careerStatus: {
    type: String,
    enum: ["Employed", "Unemployed", "Student", "Solopreneur", "Entrepreneur"],
    required: true,
  },
  interestAndAim: {
    type: String, // Replaces or complements 'reason' for clarity
    required: true,
  },
  managesImmigrantCommunity: {
    type: Boolean, // Yes/No as boolean
    required: true,
  },
  company: {
    type: String,
  },
  eventTitle: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
  },
  eventCategory: {
    type: String,
    required: true,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
});

const EventRegistration = mongoose.model(
  "EventRegistration",
  eventRegistrationSchema
);

module.exports = EventRegistration;
