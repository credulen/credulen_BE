const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const {
  createSpeaker,
  updateSpeaker,
  getSpeakerById,
  getAllSpeakers,
  deleteSpeaker,
  addPastEvent,
} = require("../controllers/speakerController");

// Middleware for file type validation
const validateFileType = (req, res, next) => {
  if (!req.files || !req.files.image) {
    return next(); // No file uploaded, continue
  }

  const file = req.files.image;
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/svg+xml",
  ];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      message:
        "Error: You can only upload image files (jpeg, jpg, png, gif, svg)!",
    });
  }

  if (file.size > maxSize) {
    return res.status(400).json({
      message: "Error: File size cannot exceed 5MB!",
    });
  }

  next();
};

// Define the routes for speaker management with image upload for create and update
router.post("/createSpeaker", validateFileType, createSpeaker);
router.put("/updateSpeaker/:id", validateFileType, updateSpeaker);
router.delete("/deleteSpeaker/:id", deleteSpeaker);
router.get("/getAllSpeakers", getAllSpeakers);
router.get("/getSpeakerById/:id", getSpeakerById);

// Route to add a past event to a speaker
router.post("/addPastEvent/:speakerId/:eventId", addPastEvent);

module.exports = router;
