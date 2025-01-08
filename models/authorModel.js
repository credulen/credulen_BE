const mongoose = require("mongoose");

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    bio: {
      type: String,
    },
    image: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    socialMedia: {
      twitter: String,
      facebook: String,
      linkedin: String,
    },
    website: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Author", authorSchema);
