// const UserModel = require("../models/userModel.js");
// const asyncHandler = require("express-async-handler");
// const dotenv = require("dotenv");
// const fs = require("fs");
// const path = require("path");
// const mongoose = require("mongoose");
// const bcrypt = require("bcrypt");

// dotenv.config();

// const getAllProfiles = asyncHandler(async (req, res) => {
//   try {
//     const users = await UserModel.find({});
//     res.status(200).json(users);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// const getProfileById = asyncHandler(async (req, res) => {
//   const { userId } = req.params;

//   if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//     return res.status(400).json({ message: "Invalid User ID" });
//   }

//   try {
//     const profile = await UserModel.findById(userId);

//     if (!profile) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Ensure the image field contains only the filename
//     if (profile.image) {
//       profile.image = path.basename(profile.image);
//     }

//     res.status(200).json(profile);
//   } catch (error) {
//     console.error("Internal Server Error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// const updateProfile = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   const updateData = { ...req.body };

//   if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//     return res.status(400).json({ message: "Invalid User ID" });
//   }

//   try {
//     const user = await UserModel.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Handle password update
//     if (updateData.password) {
//       const salt = await bcrypt.genSalt(10);
//       updateData.password = await bcrypt.hash(updateData.password, salt);
//     } else {
//       // If no new password provided, remove password field to avoid overwriting
//       delete updateData.password;
//     }

//     // Handle image update
//     let oldImageFilename = user.image ? path.basename(user.image) : null;

//     if (req.file) {
//       updateData.image = req.file.filename;

//       if (oldImageFilename) {
//         const oldImageFilePath = path.join(
//           __dirname,
//           "../uploads",
//           oldImageFilename
//         );
//         fs.unlink(oldImageFilePath, (err) => {
//           if (err && err.code !== "ENOENT") {
//             console.error(`Failed to delete old image: ${err.message}`);
//           }
//         });
//       }
//     }

//     const updatedUser = await UserModel.findByIdAndUpdate(userId, updateData, {
//       new: true,
//       select: "-password", // Exclude password from response
//     });

//     if (!updatedUser) {
//       return res.status(404).json({ message: "User not found after update" });
//     }

//     res.status(200).json(updatedUser);
//   } catch (error) {
//     console.error("Internal Server Error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// const deleteUserById = asyncHandler(async (req, res) => {
//   const { userId } = req.params;

//   if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//     return res.status(400).json({ message: "Invalid User ID" });
//   }

//   try {
//     const user = await UserModel.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if (user.image) {
//       const filePath = path.join(
//         __dirname,
//         "../uploads",
//         path.basename(user.image)
//       );
//       fs.unlink(filePath, (err) => {
//         if (err && err.code !== "ENOENT") {
//           console.error(`Failed to delete user image: ${err.message}`);
//         }
//       });
//     }

//     await UserModel.findByIdAndDelete(userId);
//     res.status(200).json({ message: "User deleted successfully" });
//   } catch (error) {
//     console.error("Internal Server Error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// const getUsers = asyncHandler(async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 5;
//     const startIndex = (page - 1) * limit;
//     const sortDirection = req.query.sort === "asc" ? 1 : -1;

//     const users = await UserModel.find()
//       .sort({ createdAt: sortDirection })
//       .skip(startIndex)
//       .limit(limit);

//     const usersWithoutPassword = users.map(
//       ({ _doc: { password, ...rest } }) => rest
//     );

//     const totalUsers = await UserModel.countDocuments();
//     const totalPages = Math.ceil(totalUsers / limit);

//     const oneMonthAgo = new Date();
//     oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
//     const lastMonthUsers = await UserModel.countDocuments({
//       createdAt: { $gte: oneMonthAgo },
//     });

//     res.status(200).json({
//       users: usersWithoutPassword,
//       totalUsers,
//       totalPages,
//       lastMonthUsers,
//     });
//   } catch (error) {
//     console.error("Internal Server Error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// const getUserById = asyncHandler(async (req, res) => {
//   const { userId } = req.params;

//   if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//     return res.status(400).json({ message: "Invalid User ID" });
//   }

//   try {
//     const user = await UserModel.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     const { password, ...rest } = user._doc;
//     res.status(200).json(rest);
//   } catch (error) {
//     console.error("Internal Server Error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// module.exports = {
//   getAllProfiles,
//   getProfileById,
//   updateProfile,
//   deleteUserById,
//   getUsers,
//   getUserById,
// };

const UserModel = require("../models/userModel.js");
const asyncHandler = require("express-async-handler");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;
const { z } = require("zod");

dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// User validation schema
const userUpdateSchema = z.object({
  username: z.string().optional(),
  email: z.string().email("Invalid email format").optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
  fullName: z.string().optional(),
  bio: z.string().optional(),
});

// Helper function to upload image to Cloudinary with retries
const uploadToCloudinary = async (
  file,
  folder = "Credulen/profiles",
  maxRetries = 3
) => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      if (!file?.tempFilePath) {
        throw new Error("No temp file path found");
      }

      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder,
        resource_type: "auto",
        quality: "auto",
        fetch_format: "auto",
      });

      await fs.unlink(file.tempFilePath);
      return result.secure_url;
    } catch (error) {
      attempt++;
      console.error(`Upload attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        throw new Error(
          `Cloudinary upload failed after ${maxRetries} attempts: ${error.message}`
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (url) => {
  try {
    if (!url) return;

    const publicId = extractPublicIdFromUrl(url);
    if (!publicId) {
      throw new Error(`Invalid Cloudinary URL format: ${url}`);
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      throw new Error(`Deletion failed for: ${publicId}`);
    }

    return true;
  } catch (error) {
    console.error(`Failed to delete from Cloudinary:`, error);
    throw error;
  }
};

// Helper function to extract public ID from Cloudinary URL
const extractPublicIdFromUrl = (url) => {
  const urlParts = url.split("/");
  const versionIndex = urlParts.findIndex((part) => part.startsWith("v"));

  if (versionIndex === -1) return null;

  return urlParts
    .slice(versionIndex + 1)
    .join("/")
    .replace(/\.[^/.]+$/, "");
};

const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updateData = { ...req.body };

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID" });
  }

  try {
    // Validate input data
    const validatedData = userUpdateSchema.parse(updateData);

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Handle password update
    if (validatedData.password) {
      const salt = await bcrypt.genSalt(10);
      validatedData.password = await bcrypt.hash(validatedData.password, salt);
    }

    // Handle image update with Cloudinary
    let imageUrl = user.image;
    if (req.files && req.files.image) {
      try {
        // Upload new image
        const newImageUrl = await uploadToCloudinary(req.files.image);

        // Delete old image if it exists
        if (user.image) {
          await deleteFromCloudinary(user.image).catch(console.error);
        }

        imageUrl = newImageUrl;
      } catch (uploadError) {
        return res.status(500).json({
          message: `Image upload failed: ${uploadError.message}`,
        });
      }
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        ...validatedData,
        image: imageUrl,
      },
      {
        new: true,
        select: "-password", // Exclude password from response
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found after update" });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const deleteUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID" });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user's image from Cloudinary if it exists
    if (user.image) {
      await deleteFromCloudinary(user.image).catch(console.error);
    }

    await UserModel.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Keeping existing functions unchanged
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

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID" });
  }

  try {
    const profile = await UserModel.findById(userId);
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const getUsers = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const startIndex = (page - 1) * limit;
    const sortDirection = req.query.sort === "asc" ? 1 : -1;

    const users = await UserModel.find()
      .sort({ createdAt: sortDirection })
      .skip(startIndex)
      .limit(limit)
      .select("-password");

    const totalUsers = await UserModel.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const lastMonthUsers = await UserModel.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      success: true,
      data: {
        users,
        totalUsers,
        totalPages,
        lastMonthUsers,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID" });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { password, ...rest } = user._doc;
    res.status(200).json(rest);
  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
module.exports = {
  getAllProfiles,
  getProfileById,
  updateProfile,
  deleteUserById,
  getUsers,
  getUserById,
};
