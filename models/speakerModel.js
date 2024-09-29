// models/speakerModel.js
const mongoose = require("mongoose");

const speakerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  bio: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  image: {
    type: String,
    default: null,
  },
  socialMedia: {
    twitter: String,
    linkedin: String,
    facebook: String,
  },
  website: String,
  expertise: [String], // Array of areas of expertise
  pastEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
  occupation: { type: String },
  CoName: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Speaker = mongoose.model("Speaker", speakerSchema);

module.exports = Speaker;
