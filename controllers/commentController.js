// comment.controller.js
const Comment = require("../models/commentModel");
const Post = require("../models/postsModel");
const { errorHandler } = require("../middlewares/errorHandling");

const createComment = async (req, res, next) => {
  try {
    const { content, postId, userId } = req.body; // Get userId from req.body

    const newComment = new Comment({
      content,
      postId,
      userId,
    });

    await newComment.save();
    await Post.findByIdAndUpdate(postId, {
      $push: { comments: newComment._id },
    });
    res.status(200).json(newComment);
  } catch (error) {
    next(error);
  }
};

const getPostComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .sort({ createdAt: -1 })
      .populate("userId", "username avatar image");
    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

const likeComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return next(errorHandler(404, "Comment not found"));
    }

    const userId = req.body.userId; // Extract userId from req.body
    if (!userId) {
      return next(errorHandler(400, "User ID is required"));
    }

    const userIdString = userId.toString(); // Convert to string for consistent comparison
    const userIndex = comment.likes.findIndex(
      (id) => id.toString() === userIdString
    );

    if (userIndex === -1) {
      comment.likes.push(userId);
    } else {
      comment.likes.splice(userIndex, 1);
    }

    await comment.save();
    res.status(200).json(comment);
  } catch (error) {
    next(errorHandler(500, "Server error while liking comment"));
  }
};
const editComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return next(errorHandler(404, "Comment not found"));
    }

    const editedComment = await Comment.findByIdAndUpdate(
      req.params.commentId,
      {
        content: req.body.content,
      },
      { new: true }
    ).populate("userId", "username avatar");
    res.status(200).json(editedComment);
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return next(errorHandler(404, "Comment not found"));
    }

    // Remove the comment from the Comment collection
    await Comment.findByIdAndDelete(req.params.commentId);

    // Remove the comment reference from the associated post
    await Post.findByIdAndUpdate(comment.postId, {
      $pull: { comments: comment._id },
    });

    res.status(200).json("Comment has been deleted");
  } catch (error) {
    next(error);
  }
};

const getComments = async (req, res, next) => {
  if (!req.user.isAdmin)
    return next(errorHandler(403, "You are not allowed to get all comments"));
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.sort === "desc" ? -1 : 1;
    const comments = await Comment.find()
      .sort({ createdAt: sortDirection })
      .skip(startIndex)
      .limit(limit)
      .populate("userId", "username avatar")
      .populate("postId", "title");
    const totalComments = await Comment.countDocuments();
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const lastMonthComments = await Comment.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });
    res.status(200).json({ comments, totalComments, lastMonthComments });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComment,
  getPostComments,
  likeComment,
  getComments,
  editComment,
  deleteComment,
};
