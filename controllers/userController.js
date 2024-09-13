const UserModel = require("../models/userModel.js");
const asyncHandler = require("express-async-handler");
const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");
const path = require("path");

const getAllProfiles = asyncHandler(async (req, res) => {
  try {
    const users = await UserModel.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const getProfileById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const profile = await UserModel.findById(userId);

    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure the image field contains only the filename
    if (profile.image) {
      // If the image field is a URL, extract only the filename
      try {
        const imageUrl = new URL(profile.image);
        profile.image = path.basename(imageUrl.pathname);
      } catch (error) {
        // If URL parsing fails, assume it's already a filename
        profile.image = path.basename(profile.image);
      }
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Internal Server Error:", error); // Log error details
    res.status(500).json({ message: error.message });
  }
});

const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updateData = req.body;

  try {
    // Fetch the current user data to get the old image path
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract filename from the old image path if it exists
    let oldImageFilename = null;
    if (user.image) {
      // If the image field is a URL, extract the filename from the URL
      try {
        const oldImageUrl = new URL(user.image);
        oldImageFilename = path.basename(oldImageUrl.pathname); // Extract the filename
      } catch (error) {
        // If the URL parsing fails, assume it's already just a filename
        oldImageFilename = path.basename(user.image);
      }
    }

    if (req.file) {
      // If a new file is uploaded, store only the filename
      updateData.image = req.file.filename;

      // Delete the old image if it exists
      if (oldImageFilename) {
        const oldImageFilePath = path.join(
          __dirname,
          "../uploads",
          oldImageFilename
        );

        // Check if the file exists before trying to delete
        fs.access(oldImageFilePath, fs.constants.F_OK, (err) => {
          if (err) {
            console.error(`Old image file not found: ${oldImageFilePath}`);
          } else {
            fs.unlink(oldImageFilePath, (err) => {
              if (err) {
                console.error(`Failed to delete old image: ${err.message}`);
              } else {
                console.log(
                  `Successfully deleted old image: ${oldImageFilePath}`
                );
              }
            });
          }
        });
      }
    }

    // Update the user with new data
    const updatedUser = await UserModel.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found after update" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Internal Server Error:", error); // Log error details
    res.status(500).json({ message: error.message });
  }
});

const deleteUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Find and delete the user
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Optionally, delete the associated image
    if (user.image) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(__dirname, "../uploads", user.image);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await UserModel.findByIdAndDelete(userId);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const getUsers = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.sort === "asc" ? 1 : -1;

    const users = await UserModel.find()
      .sort({ createdAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    const usersWithoutPassword = users.map((user) => {
      const { password, ...rest } = user._doc;
      return rest;
    });

    const totalUsers = await UserModel.countDocuments();

    const now = new Date();

    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const lastMonthUsers = await UserModel.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      users: usersWithoutPassword,
      totalUsers,
      lastMonthUsers,
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.userId);
    if (!user) {
      return next(errorHandler(404, "User not found"));
    }
    const { password, ...rest } = user._doc;
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProfiles,
  getProfileById,
  updateProfile,
  deleteUserById,
  getUsers,
  getUserById,
};
