const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

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

// Define the route for creating a post with image upload
router.post("/createPost", upload.single("image"), createPost);
router.put("/updatePost/:postId", upload.single("image"), updatePost);
router.delete("/deletePost/:postId", deletePost);
router.get("/getPosts", getPosts);
router.get("/getPostById/:postId", getPostById);
router.get("/getPostBySlug/:slug", getPostBySlug);
router.post("/likePost/:postId", likePost);
router.get("/related-posts", getRelatedPosts);

module.exports = router;
