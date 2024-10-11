// models/NewsletterSubscription.js
const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const NewsLetter = mongoose.model("NewsLetter", newsletterSchema);

module.exports = NewsLetter;
