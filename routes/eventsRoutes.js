const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Import controller functions
const {
  createEvent,
  getEvents,
  getEventById,
  getEventBySlug,
  updateEvent,
  deleteEvent,
  registerEvent,
  verifyRegistration,
  getAllRegisteredEvents,
  getRelatedEvents,
  handleDeleteByEvent,
} = require("../controllers/eventsController");

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

// Define routes for events
router.post("/createEvent", validateFileType, createEvent);
router.put("/updateEvent/:eventId", validateFileType, updateEvent);
router.get("/getEvents", getEvents);
router.get("/getEventById/:eventId", getEventById);
router.get("/getEventBySlug/:slug", getEventBySlug);
router.delete("/deleteEvent/:eventId", deleteEvent);
router.post("/register-event/", registerEvent);
router.post("/verify-registration", verifyRegistration);
router.get("/related-events", getRelatedEvents);
router.get("/getAllRegisteredEvents", getAllRegisteredEvents);
router.delete("/handleDeleteByEvent", handleDeleteByEvent);

module.exports = router;
