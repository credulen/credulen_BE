// const UserModel = require("../models/userModel.js");
// const asyncHandler = require("express-async-handler");
// const dotenv = require("dotenv");
// const mongoose = require("mongoose");
// const bcrypt = require("bcrypt");
// const cloudinary = require("cloudinary").v2;
// const fs = require("fs").promises;
// const { z } = require("zod");

// dotenv.config();

// // Cloudinary configuration
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // User validation schema
// const userUpdateSchema = z.object({
//   username: z.string().optional(),
//   email: z.string().email("Invalid email format").optional(),
//   password: z
//     .string()
//     .min(6, "Password must be at least 6 characters")
//     .optional(),
//   fullName: z.string().optional(),
//   bio: z.string().optional(),
// });

// // Helper function to upload image to Cloudinary with retries
// const uploadToCloudinary = async (
//   file,
//   folder = "Credulen/profiles",
//   maxRetries = 3
// ) => {
//   let attempt = 0;

//   while (attempt < maxRetries) {
//     try {
//       if (!file?.tempFilePath) {
//         throw new Error("No temp file path found");
//       }

//       const result = await cloudinary.uploader.upload(file.tempFilePath, {
//         folder,
//         resource_type: "auto",
//         quality: "auto",
//         fetch_format: "auto",
//       });

//       await fs.unlink(file.tempFilePath);
//       return result.secure_url;
//     } catch (error) {
//       attempt++;
//       console.error(`Upload attempt ${attempt} failed:`, error);

//       if (attempt === maxRetries) {
//         throw new Error(
//           `Cloudinary upload failed after ${maxRetries} attempts: ${error.message}`
//         );
//       }

//       await new Promise((resolve) =>
//         setTimeout(resolve, Math.pow(2, attempt) * 1000)
//       );
//     }
//   }
// };

// // Helper function to delete image from Cloudinary
// const deleteFromCloudinary = async (url) => {
//   try {
//     if (!url) return;

//     const publicId = extractPublicIdFromUrl(url);
//     if (!publicId) {
//       throw new Error(`Invalid Cloudinary URL format: ${url}`);
//     }

//     const result = await cloudinary.uploader.destroy(publicId);

//     if (result.result !== "ok") {
//       throw new Error(`Deletion failed for: ${publicId}`);
//     }

//     return true;
//   } catch (error) {
//     console.error(`Failed to delete from Cloudinary:`, error);
//     throw error;
//   }
// };

// // Helper function to extract public ID from Cloudinary URL
// const extractPublicIdFromUrl = (url) => {
//   const urlParts = url.split("/");
//   const versionIndex = urlParts.findIndex((part) => part.startsWith("v"));

//   if (versionIndex === -1) return null;

//   return urlParts
//     .slice(versionIndex + 1)
//     .join("/")
//     .replace(/\.[^/.]+$/, "");
// };

// const updateProfile = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   const updateData = { ...req.body };

//   if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//     return res.status(400).json({ message: "Invalid User ID" });
//   }

//   try {
//     // Validate input data
//     const validatedData = userUpdateSchema.parse(updateData);

//     const user = await UserModel.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Handle password update
//     if (validatedData.password) {
//       const salt = await bcrypt.genSalt(10);
//       validatedData.password = await bcrypt.hash(validatedData.password, salt);
//     }

//     // Handle image update with Cloudinary
//     let imageUrl = user.image;
//     if (req.files && req.files.image) {
//       try {
//         // Upload new image
//         const newImageUrl = await uploadToCloudinary(req.files.image);

//         // Delete old image if it exists
//         if (user.image) {
//           await deleteFromCloudinary(user.image).catch(console.error);
//         }

//         imageUrl = newImageUrl;
//       } catch (uploadError) {
//         return res.status(500).json({
//           message: `Image upload failed: ${uploadError.message}`,
//         });
//       }
//     }

//     const updatedUser = await UserModel.findByIdAndUpdate(
//       userId,
//       {
//         ...validatedData,
//         image: imageUrl,
//       },
//       {
//         new: true,
//         select: "-password", // Exclude password from response
//         runValidators: true,
//       }
//     );

//     if (!updatedUser) {
//       return res.status(404).json({ message: "User not found after update" });
//     }

//     res.status(200).json({
//       success: true,
//       data: updatedUser,
//     });
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       return res.status(400).json({ message: error.errors[0].message });
//     }
//     console.error("Update profile error:", error);
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

//     // Delete user's image from Cloudinary if it exists
//     if (user.image) {
//       await deleteFromCloudinary(user.image).catch(console.error);
//     }

//     await UserModel.findByIdAndDelete(userId);

//     res.status(200).json({
//       success: true,
//       message: "User deleted successfully",
//     });
//   } catch (error) {
//     console.error("Delete user error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // Keeping existing functions unchanged
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

//     res.status(200).json({
//       success: true,
//       data: profile,
//     });
//   } catch (error) {
//     console.error("Get profile error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// const getUsers = async (req, res) => {
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 9;
//   const role = req.query.role || ""; // Get role from query params
//   const skip = (page - 1) * limit;

//   try {
//     // Build query object
//     const query = {};
//     if (role && ["user", "agent", "admin"].includes(role)) {
//       query.role = role;
//     }

//     const users = await UserModel.find(query)
//       .select("_id username email role agentId updatedAt image")
//       .skip(skip)
//       .limit(limit)
//       .sort({ updatedAt: -1 });

//     const totalUsers = await UserModel.countDocuments(query);

//     res.status(200).json({
//       data: { users },
//       totalUsers,
//       totalPages: Math.ceil(totalUsers / limit),
//       currentPage: page,
//     });
//   } catch (error) {
//     console.error("Error fetching users:", error.message);
//     res.status(500).json({ message: "Failed to fetch users" });
//   }
// };

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

const userUpdateSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .optional(),
  email: z.string().email("Invalid email format").optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
  fullName: z
    .string()
    .max(100, "Full name must be 100 characters or less")
    .optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  phoneNumber: z
    .string()
    .optional()
    .refine(
      (val) => val === "" || /^[+\d\s-]{10,15}$/.test(val),
      (val) => ({
        message: `Phone number "${val}" must be empty or 10-15 characters, allowing digits, +, -, and spaces`,
      })
    ),
  agentId: z
    .string()
    .regex(
      /^[a-zA-Z0-9]{5,15}$/,
      "Agent ID must be 5-15 alphanumeric characters"
    )
    .optional(),
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

// Update user profile
const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updateData = { ...req.body };

  console.log("Request Body:", req.body); // Debug incoming data

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID" });
  }

  try {
    // Validate input data
    const validatedData = userUpdateSchema.parse(updateData);
    console.log("Validated Data:", validatedData); // Debug validated data

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Handle agentId update for agents
    if (validatedData.agentId && user.role === "agent") {
      const existingAgent = await UserModel.findOne({
        agentId: validatedData.agentId,
      });
      if (existingAgent && existingAgent._id.toString() !== userId) {
        return res.status(400).json({ message: "Agent ID is already taken" });
      }
      validatedData.agentId = validatedData.agentId.toUpperCase();
    } else if (validatedData.agentId && user.role !== "agent") {
      return res
        .status(400)
        .json({ message: "Only agents can update Agent ID" });
    }

    // Handle password update
    if (validatedData.password) {
      const salt = await bcrypt.genSalt(10);
      validatedData.password = await bcrypt.hash(validatedData.password, salt);
    }

    // Normalize phoneNumber (remove spaces and hyphens)
    if (validatedData.phoneNumber) {
      validatedData.phoneNumber = validatedData.phoneNumber.replace(
        /[\s-]/g,
        ""
      );
      console.log("Normalized phoneNumber:", validatedData.phoneNumber);
    }

    // Handle image update with Cloudinary
    let imageUrl = user.image;
    if (req.files && req.files.image) {
      try {
        const newImageUrl = await uploadToCloudinary(req.files.image);
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
        updatedAt: Date.now(),
      },
      {
        new: true,
        select: "-password",
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found after update" });
    }

    console.log("Updated User:", updatedUser); // Debug updated user

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        bio: updatedUser.bio,
        phoneNumber: updatedUser.phoneNumber,
        agentId: updatedUser.agentId,
        image: updatedUser.image,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt,
        googleId: updatedUser.googleId,
        picture: updatedUser.picture,
        uniqueId: updatedUser.uniqueId,
        referrals: updatedUser.referrals,
        referredBy: updatedUser.referredBy,
        verifiedEmail: updatedUser.verifiedEmail,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.errors);
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete user account
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

// Fetch user profile by ID
const getProfileById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID" });
  }

  try {
    const profile = await UserModel.findById(userId)
      .select(
        "username email role agentId image updatedAt fullName bio referredBy phoneNumber" // Changed PhoneNumber to phoneNumber
      )
      .populate("referredBy", "agentId username email fullName");
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Fetched Profile:", profile); // Debug fetched profile

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get users with pagination and role filter
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const role = req.query.role || "";
  const skip = (page - 1) * limit;

  try {
    const query = {};
    if (role && ["user", "agent", "admin"].includes(role)) {
      query.role = role;
    }

    const users = await UserModel.find(query)
      .select(
        "_id username email role agentId updatedAt image referrals phoneNumber" // Changed PhoneNumber to phoneNumber
      )
      .populate({
        path: "referrals",
        select: "_id username email role image",
      })
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 });

    const totalUsers = await UserModel.countDocuments(query);

    console.log("Fetched Users:", users); // Debug fetched users

    res.status(200).json({
      data: { users },
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

module.exports = {
  getProfileById,
  updateProfile,
  deleteUserById,
  getUsers,
};
