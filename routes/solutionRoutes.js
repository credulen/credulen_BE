const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Import controller functions
const {
  createSolution,
  getAllSolutions,
  getConsultingServiceForms,
  getAllSolutionLists,
  getSolutionBySlug,
  updateSolution,
  deleteSolution,
  submitSolutionForm,
  getSolutionForms,
  deleteSolutionsByType,
  NewLetterSubscribe,
  getNewsletterSubscribers,
  registerForSolution,
} = require("../controllers/solutionController");

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
router.post("/createSolution/", validateFileType, createSolution);
router.put("/updateSolution/:slug", validateFileType, updateSolution);
router.delete("/deleteSolution/:solutionId", deleteSolution);
router.get("/getAllSolutions", getAllSolutions);
router.get("/getConsultingServiceForms", getConsultingServiceForms);
router.get("/getAllSolutionLists", getAllSolutionLists);
router.get("/getSolutionBySlug/:slug", getSolutionBySlug);
router.post("/submitSolutionForm", submitSolutionForm);
router.get("/getSolutionForms", getSolutionForms);
router.delete("/deleteSolutionsByType", deleteSolutionsByType);
router.post("/newsletter-signup", NewLetterSubscribe);
router.get("/getNewsletterSubscribers", getNewsletterSubscribers);
router.post("/registerForSolution", registerForSolution);

module.exports = router;
