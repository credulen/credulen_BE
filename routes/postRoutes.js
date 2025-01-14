const express = require("express");
const router = express.Router();

// Import controller functions
const {
  createPost,
  updatePost,
  deletePost,
  getPosts,
  getPostById,
  getPostBySlug,
  likePost,
  getRelatedPosts,
} = require("../controllers/postController");

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

// Define routes with file validation middleware
router.post("/createPost", validateFileType, createPost);
router.put("/updatePost/:postId", validateFileType, updatePost);
router.delete("/deletePost/:postId", deletePost);
router.get("/getPosts", getPosts);
router.get("/getPostById/:postId", getPostById);
router.get("/getPostBySlug/:slug", getPostBySlug);
router.post("/likePost/:postId", likePost);
router.get("/related-posts", getRelatedPosts);

module.exports = router;
