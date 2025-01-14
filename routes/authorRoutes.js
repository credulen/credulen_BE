const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const {
  createAuthor,
  updateAuthor,
  getAuthorById,
  getAllAuthors,
  deleteAuthor,
} = require("../controllers/authorController");

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

// Define the route for creating a post with image upload
router.post("/createAuthor", validateFileType, createAuthor);
router.put("/updateAuthor/:id", validateFileType, updateAuthor);
router.delete("/deleteAuthor/:id", deleteAuthor);
router.get("/getAllAuthors", getAllAuthors);
router.get("/getAuthorById/:id", getAuthorById);

module.exports = router;
