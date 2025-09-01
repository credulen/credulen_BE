const express = require("express");
const router = express.Router();
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

// Define routes with proper method chaining
// router.route("/Users").get(getAllProfiles);
router.route("/Users/:userId").get(getProfileById);
// router.route("/Users/:userId").put, updateProfile);
router.put("/Users/:userId", validateFileType, updateProfile);
router.route("/Delete/:userId").delete(deleteUserById);

router.route("/getUsers").get(getUsers);
// router.route("/getUsers/:userId").get(getUserById);

module.exports = router;
