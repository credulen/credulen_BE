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

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory where files will be saved
  },
  filename: (req, file, cb) => {
    console.log("Saving file with name:", file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`); // Append timestamp to avoid filename collisions
  },
});

// Initialize multer for handling single file upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit for file size
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb); // Validate file type
  },
});

// Check file type function
const checkFileType = (file, cb) => {
  const fileTypes = /jpeg|jpg|png|gif|svg/;
  // Check file extension
  const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
  // Check MIME type
  const mimeType = fileTypes.test(file.mimetype);
  if (mimeType && extName) {
    return cb(null, true); // If valid, accept the file
  } else {
    cb("Error: You can only upload image files (jpeg, jpg, png, gif, svg)!");
  }
};

// Define routes for events
router.post("/createEvent", upload.single("image"), createEvent);
router.get("/getEvents", getEvents);
router.get("/getEventById/:eventId", getEventById);
router.get("/getEventBySlug/:slug", getEventBySlug);
router.put("/updateEvent/:eventId", upload.single("image"), updateEvent);
router.delete("/deleteEvent/:eventId", deleteEvent);
router.post("/register-event/", registerEvent);
router.post("/verify-registration", verifyRegistration);
router.get("/related-events", getRelatedEvents);
router.get("/getAllRegisteredEvents", getAllRegisteredEvents);
router.delete("/handleDeleteByEvent", handleDeleteByEvent);

module.exports = router;
