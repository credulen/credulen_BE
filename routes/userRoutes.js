const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Import controller functions
const {
  getAllProfiles,
  getProfileById,
  updateProfile,
  deleteUserById,
  getUsers,
  getUserById,
} = require("../controllers/userController");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    console.log("Saving file with name:", file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Initialize multer for handling single file upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
});

// Check file type
const checkFileType = (file, cb) => {
  const fileTypes = /jpeg|jpg|png|gif|svg/;

  // Check extension names
  const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());

  // Check mime type
  const mimeType = fileTypes.test(file.mimetype);

  if (mimeType && extName) {
    return cb(null, true);
  } else {
    cb("Error: You can only upload images!");
  }
};

// Define routes with proper method chaining
router.route("/Users").get(getAllProfiles);
router.route("/Users/:userId").get(getProfileById);
router.route("/Users/:userId").put(upload.single("image"), updateProfile);
router.route("/Delete/:userId").delete(deleteUserById);
router.route("/getUsers").get(getUsers);
router.route("/getUsers/:userId").get(getUserById);

module.exports = router;
