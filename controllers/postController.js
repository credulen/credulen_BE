const Post = require("../models/postsModel.js");
const { errorHandler } = require("../middlewares/errorHandling.js");
const Author = require("../models/authorModel.js");

const createPost = async (req, res, next) => {
  try {
    const { title, content, category, authorId } = req.body;

    // Validate title, content, and authorId
    if (!title || !content || !authorId) {
      return next(errorHandler(400, "Title, content, and author are required"));
    }

    // Check if the author exists
    const authorExists = await Author.findById(authorId);
    if (!authorExists) {
      return next(errorHandler(404, "Author not found"));
    }

    const existingPost = await Post.findOne({ title });
    if (existingPost) {
      return res.status(400).json({ message: "Post with same title exists" });
    }

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Create slug from title
    const slug = title
      .split(" ")
      .join("-")
      .toLowerCase()
      .replace(/[^a-zA-Z0-9-]/g, "");

    // Create a new post document
    const newPost = new Post({
      title,
      content,
      category: category || "Uncategorized",
      slug,
      image: imageUrl,
      authorId, // Include the authorId
    });

    // Save post to database
    const savedPost = await newPost.save();

    // Return response
    res.status(201).json(savedPost);
  } catch (error) {
    console.error("Error in createPost:", error);
    next(error); // Pass error to the global error handler
  }
};

const getPosts = async (req, res, next) => {
  try {
    // Extract query parameters with default values
    const startIndex = parseInt(req.query.startIndex, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 9;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    // Build query filter based on provided query parameters
    const query = {
      ...(req.query.category && { category: req.query.category }),
      ...(req.query.slug && { slug: req.query.slug }),
      ...(req.query.postId && { _id: req.query.postId }),
      ...(req.query.searchTerm && {
        $or: [
          { title: { $regex: req.query.searchTerm, $options: "i" } },
          { content: { $regex: req.query.searchTerm, $options: "i" } },
        ],
      }),
    };

    // Fetch posts with sorting, pagination, filtering, and populate author details
    const posts = await Post.find(query)
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      .limit(limit)
      .populate("authorId", "name image bio"); // Populate author details

    // Get total number of posts
    const totalPosts = await Post.countDocuments(query);

    // Calculate the number of posts created in the last month
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const lastMonthPosts = await Post.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    // Respond with posts (including author details), total count, and last month count
    res.status(200).json({
      posts,
      totalPosts,
      lastMonthPosts,
    });
  } catch (error) {
    next(error); // Pass error to the global error handler
  }
};

const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return next(errorHandler(404, "Post not found"));
    }
    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};

const getPostBySlug = async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).populate(
      "authorId",
      "name image bio"
    );
    if (!post) {
      return next(errorHandler(404, "Post not found"));
    }
    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const { postId } = req.params; // Post ID from URL parameters
    const { title, content, category } = req.body;
    console.log("Received postId:", postId);
    console.log("Received body:", req.body);

    // Validate title and content
    if (!title || !content) {
      return next(errorHandler(400, "Title and content are required"));
    }

    // Find the existing post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return next(errorHandler(404, "Post not found"));
    }

    // Handle image upload
    let imageUrl = post.image;
    if (req.file) {
      // Construct the URL for the uploaded image
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Create slug from title
    const slug = title
      .split(" ")
      .join("-")
      .toLowerCase()
      .replace(/[^a-zA-Z0-9-]/g, "");

    // Update post fields
    post.title = title;
    post.content = content;
    post.category = category || "Uncategorized";
    post.slug = slug;
    post.image = imageUrl;

    // Save updated post to database
    const updatedPost = await post.save();

    // Return response
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error in updatePost:", error);
    next(error); // Pass error to the global error handler
  }
};

// Controller to delete a post
const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params; // Post ID from URL parameters

    // Find and delete the post
    const deletedPost = await Post.findByIdAndDelete(postId);

    // Check if the post was found and deleted
    if (!deletedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Return success response
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error.message); // Log error
    next(error); // Pass error to the global error handler
  }
};

const likePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const userId = req.body.userId;

    if (!postId || !userId) {
      return next(errorHandler(400, "Post ID and User ID are required"));
    }

    const post = await Post.findById(postId);
    if (!post) {
      return next(errorHandler(404, "Post not found"));
    }

    const userLikeIndex = post.likes.indexOf(userId);
    let isLiked = false;

    if (userLikeIndex === -1) {
      // User hasn't liked the post, so add the like
      post.likes.push(userId);
      isLiked = true;
    } else {
      // User has already liked the post, so remove the like
      post.likes.splice(userLikeIndex, 1);
      isLiked = false;
    }

    // Update likesCount
    post.likesCount = post.likes.length;

    // Save the updated post
    const updatedPost = await post.save();

    res.status(200).json({
      success: true,
      likesCount: updatedPost.likesCount,
      isLiked: isLiked,
      message: isLiked
        ? "Post liked successfully"
        : "Post unliked successfully",
    });
  } catch (error) {
    console.error("Error in likePost:", error);
    next(error);
  }
};

const getRelatedPosts = async (req, res, next) => {
  try {
    const { category, currentPostId } = req.query;

    if (!category || !currentPostId) {
      return next(
        errorHandler(400, "Category and current post ID are required")
      );
    }

    const relatedPosts = await Post.find({
      category: category,
      _id: { $ne: currentPostId }, // Exclude the current post
    })
      .select("title content image slug likes comments createdAt") // Select only necessary fields
      .limit(4) // Limit to 4 related posts
      .populate("authorId", "name image"); // Populate author details

    res.status(200).json(relatedPosts);
  } catch (error) {
    console.error("Error in getRelatedPosts:", error);
    next(error);
  }
};

module.exports = {
  likePost,
  deletePost,
  updatePost,
  getPostById,
  getPosts,
  createPost,
  getPostBySlug,
  getRelatedPosts,
};
