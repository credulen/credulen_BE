const Post = require("../models/postsModel.js");
const { errorHandler } = require("../middlewares/errorHandling.js");
const Author = require("../models/authorModel.js");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file, folder = "Credulen/posts") => {
  try {
    if (!file?.tempFilePath) {
      throw new Error("No temp file path found");
    }

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: folder,
      resource_type: "auto",
    });

    // Clean up temp file
    await fs.unlink(file.tempFilePath);
    return result.secure_url;
  } catch (error) {
    console.error("Upload to Cloudinary failed:", error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (url) => {
  try {
    if (!url) return;

    // Parse the Cloudinary URL
    const urlParts = url.split("/");
    const versionIndex = urlParts.findIndex((part) => part.startsWith("v"));

    if (versionIndex === -1) {
      console.error(`Invalid Cloudinary URL format: ${url}`);
      return;
    }

    const publicId = urlParts
      .slice(versionIndex + 1)
      .join("/")
      .replace(/\.[^/.]+$/, "");

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
    } else {
      console.error(`Deletion failed for: ${publicId}`, result);
    }
  } catch (error) {
    console.error(`Failed to delete from Cloudinary:`, error);
  }
};

const createPost = async (req, res, next) => {
  try {
    const { title, content, category, authorId } = req.body;

    // Validate required fields
    if (!title || !content || !authorId) {
      return next(errorHandler(400, "Title, content, and author are required"));
    }

    // Check if author exists
    const authorExists = await Author.findById(authorId);
    if (!authorExists) {
      return next(errorHandler(404, "Author not found"));
    }

    // Check for duplicate title
    const existingPost = await Post.findOne({ title: title.trim() });
    if (existingPost) {
      return next(errorHandler(400, "Post with same title already exists"));
    }

    // Handle image upload to Cloudinary
    let imageUrl = null;
    if (req.files && req.files.image) {
      try {
        imageUrl = await uploadToCloudinary(req.files.image);
      } catch (uploadError) {
        return next(
          errorHandler(500, `Image upload failed: ${uploadError.message}`)
        );
      }
    }

    // Create slug from title
    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Create and save new post
    const newPost = new Post({
      title: title.trim(),
      content: content.trim(),
      category: category?.trim() || "Uncategorized",
      slug,
      image: imageUrl,
      authorId,
    });

    const savedPost = await newPost.save();

    res.status(201).json({
      success: true,
      post: savedPost,
      message: "Post created successfully",
    });
  } catch (error) {
    console.error("Error in createPost:", error);
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { title, content, category } = req.body;

    if (!title || !content) {
      return next(errorHandler(400, "Title and content are required"));
    }

    const post = await Post.findById(postId);
    if (!post) {
      return next(errorHandler(404, "Post not found"));
    }

    // Handle image update
    let imageUrl = post.image;
    if (req.files && req.files.image) {
      try {
        // Delete old image if it exists
        if (post.image) {
          await deleteFromCloudinary(post.image);
        }
        // Upload new image
        imageUrl = await uploadToCloudinary(req.files.image);
      } catch (uploadError) {
        return next(
          errorHandler(500, `Image upload failed: ${uploadError.message}`)
        );
      }
    }

    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Update post
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        title: title.trim(),
        content: content.trim(),
        category: category?.trim() || post.category,
        slug,
        image: imageUrl,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      post: updatedPost,
      message: "Post updated successfully",
    });
  } catch (error) {
    console.error("Error in updatePost:", error);
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

const getPosts = async (req, res, next) => {
  try {
    // Extract query parameters with default values
    const startIndex = parseInt(req.query.startIndex, 10) || 0;
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

const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Delete image from Cloudinary if it exists
    if (post.image) {
      await deleteFromCloudinary(post.image);
    }

    // Delete post from database
    await Post.findByIdAndDelete(postId);
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    next(error);
  }
};

// Export all other functions without changes
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
