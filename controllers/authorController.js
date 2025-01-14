// const Author = require("../models/authorModel.js");
// const { errorHandler } = require("../middlewares/errorHandling.js");
// const createAuthor = async (req, res, next) => {
//   try {
//     const { name, bio, email, socialMedia, website } = req.body;

//     // Validate required fields
//     if (!name) {
//       return next(errorHandler(400, "Author name is required"));
//     }

//     if (!email) {
//       return next(errorHandler(400, "Email is required"));
//     }

//     // Check if author with the same name or email already exists
//     const existingAuthor = await Author.findOne({
//       $or: [{ name }, { email }],
//     });
//     if (existingAuthor) {
//       return res.status(400).json({
//         message: "Author with the same name or email already exists",
//       });
//     }

//     // Handle image upload (if applicable)
//     let imageUrl = null;
//     if (req.file) {
//       // If an image is uploaded, save its path (assuming you're handling uploads elsewhere)
//       imageUrl = `/uploads/${req.file.filename}`;
//     }

//     // Create a new author document
//     const newAuthor = new Author({
//       name,
//       bio,
//       email,
//       image: imageUrl,
//       socialMedia,
//       website,
//     });

//     // Save the author to the database
//     const savedAuthor = await newAuthor.save();

//     // Return the newly created author in the response
//     res.status(201).json(savedAuthor);
//   } catch (error) {
//     console.error("Error creating author:", error);
//     next(error);
//   }
// };

// const updateAuthor = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { name, bio, email, socialMedia, website } = req.body;

//     // Validate required fields
//     if (!name) {
//       return next(errorHandler(400, "Author name is required"));
//     }

//     if (!email) {
//       return next(errorHandler(400, "Email is required"));
//     }

//     // Handle image upload (if applicable)
//     let imageUrl = null;
//     if (req.file) {
//       imageUrl = `/uploads/${req.file.filename}`;
//     }

//     // Find the author and update their information
//     const updatedAuthor = await Author.findByIdAndUpdate(
//       id,
//       {
//         name,
//         bio,
//         email,
//         image: imageUrl || undefined, // If no image uploaded, keep the existing one
//         socialMedia,
//         website,
//       },
//       { new: true, runValidators: true }
//     );

//     if (!updatedAuthor) {
//       return res.status(404).json({ message: "Author not found" });
//     }

//     // Return the updated author
//     res.status(200).json(updatedAuthor);
//   } catch (error) {
//     console.error("Error updating author:", error);
//     next(error);
//   }
// };

// const getAuthorById = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     // Find author by ID
//     const author = await Author.findById(id);
//     if (!author) {
//       return res.status(404).json({ message: "Author not found" });
//     }

//     // Return the found author
//     res.status(200).json(author);
//   } catch (error) {
//     console.error("Error retrieving author:", error);
//     next(error);
//   }
// };

// const getAllAuthors = async (req, res, next) => {
//   try {
//     // Retrieve all authors
//     const authors = await Author.find({});
//     res.status(200).json(authors);
//   } catch (error) {
//     console.error("Error retrieving authors:", error);
//     next(error);
//   }
// };

// const deleteAuthor = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     // Find author by ID and remove them
//     const deletedAuthor = await Author.findByIdAndDelete(id);
//     if (!deletedAuthor) {
//       return res.status(404).json({ message: "Author not found" });
//     }

//     // Return success message
//     res.status(200).json({ message: "Author deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting author:", error);
//     next(error);
//   }
// };

// module.exports = {
//   createAuthor,
//   updateAuthor,
//   getAuthorById,
//   getAllAuthors,
//   deleteAuthor,
// };

const Author = require("../models/authorModel.js");
const { errorHandler } = require("../middlewares/errorHandling.js");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file, folder = "Credulen/authors") => {
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

const createAuthor = async (req, res, next) => {
  try {
    const { name, bio, email, socialMedia, website } = req.body;

    if (!name) {
      return next(errorHandler(400, "Author name is required"));
    }
    if (!email) {
      return next(errorHandler(400, "Email is required"));
    }

    const existingAuthor = await Author.findOne({
      $or: [{ name }, { email }],
    });
    if (existingAuthor) {
      return res.status(400).json({
        message: "Author with the same name or email already exists",
      });
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

    const newAuthor = new Author({
      name,
      bio,
      email,
      image: imageUrl,
      socialMedia,
      website,
    });

    const savedAuthor = await newAuthor.save();
    res.status(201).json(savedAuthor);
  } catch (error) {
    console.error("Error creating author:", error);
    next(error);
  }
};

const updateAuthor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, bio, email, socialMedia, website } = req.body;

    if (!name) {
      return next(errorHandler(400, "Author name is required"));
    }
    if (!email) {
      return next(errorHandler(400, "Email is required"));
    }

    const existingAuthor = await Author.findById(id);
    if (!existingAuthor) {
      return res.status(404).json({ message: "Author not found" });
    }

    // Handle image update
    let imageUrl = existingAuthor.image;
    if (req.files && req.files.image) {
      try {
        // Delete old image if it exists
        if (existingAuthor.image) {
          await deleteFromCloudinary(existingAuthor.image);
        }
        // Upload new image
        imageUrl = await uploadToCloudinary(req.files.image);
      } catch (uploadError) {
        return next(
          errorHandler(500, `Image upload failed: ${uploadError.message}`)
        );
      }
    }

    const updatedAuthor = await Author.findByIdAndUpdate(
      id,
      {
        name,
        bio,
        email,
        image: imageUrl,
        socialMedia,
        website,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedAuthor);
  } catch (error) {
    console.error("Error updating author:", error);
    next(error);
  }
};

const deleteAuthor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const author = await Author.findById(id);
    if (!author) {
      return res.status(404).json({ message: "Author not found" });
    }

    // Delete image from Cloudinary if it exists
    if (author.image) {
      await deleteFromCloudinary(author.image);
    }

    // Delete author from database
    await Author.findByIdAndDelete(id);
    res.status(200).json({ message: "Author deleted successfully" });
  } catch (error) {
    console.error("Error deleting author:", error);
    next(error);
  }
};

// Keep existing getAuthorById and getAllAuthors functions as they are
const getAuthorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const author = await Author.findById(id);
    if (!author) {
      return res.status(404).json({ message: "Author not found" });
    }
    res.status(200).json(author);
  } catch (error) {
    console.error("Error retrieving author:", error);
    next(error);
  }
};

const getAllAuthors = async (req, res, next) => {
  try {
    const authors = await Author.find({});
    res.status(200).json(authors);
  } catch (error) {
    console.error("Error retrieving authors:", error);
    next(error);
  }
};

module.exports = {
  createAuthor,
  updateAuthor,
  getAuthorById,
  getAllAuthors,
  deleteAuthor,
};
