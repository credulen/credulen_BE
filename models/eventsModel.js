const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  eventType: {
    type: String,
    required: true,
    enum: ["conference", "workshop", "seminar", "webinar", "podcast", "other"],
  },

  subCategory: {
    type: String,
    enum: ["General", "Executive (B2B)", "others"],
    default: "others",
  },

  image: {
    type: String,
    default: null,
  },
  content: {
    type: String,
  },
  category: {
    type: String,
  },
  videoUrl: {
    type: String,
  },
  date: {
    type: Date,
  },
  venue: {
    type: String,
  },
  meetingId: {
    type: String,
  },
  passcode: {
    type: String,
  },
  duration: {
    type: String,
  },
  meetingLink: {
    type: String,
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  speakers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Speaker",
    },
  ],
  attendees: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  slug: {
    type: String,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
