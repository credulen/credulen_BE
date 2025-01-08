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
  company: {
    type: String,
  },
  reason: {
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
