const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Import controller functions
const {
  createComment,
  getPostComments,
  likeComment,
  getComments,
  editComment,
  deleteComment,
} = require("../controllers/commentController");

// Define the route for creating a post with image upload
router.post("/createComment", createComment);
router.put("/editComment/:commentId", editComment);
router.delete("/deleteComment/:commentId", deleteComment);
router.get("/getPostComments/:postId", getPostComments);
router.post("/likeComment/:commentId", likeComment);
router.get("/getComments", getComments);

module.exports = router;
