// const Speaker = require("../models/speakerModel");
// const Event = require("../models/eventsModel");
// const { errorHandler } = require("../middlewares/errorHandling");
// const mongoose = require("mongoose");

// const createSpeaker = async (req, res, next) => {
//   try {
//     const { name, bio, email, CoName, occupation } = req.body;
//     if (!name || !email) {
//       return next(errorHandler(400, "Speaker name and email are required"));
//     }

//     const existingSpeaker = await Speaker.findOne({
//       $or: [{ name }, { email }],
//     });
//     if (existingSpeaker) {
//       return next(
//         errorHandler(400, "Speaker with the same name or email already exists")
//       );
//     }

//     let imageUrl = null;
//     if (req.file) {
//       imageUrl = `/uploads/${req.file.filename}`;
//     }

//     const newSpeaker = new Speaker({
//       name,
//       bio,
//       email,
//       image: imageUrl,
//       CoName,
//       occupation,
//     });

//     const savedSpeaker = await newSpeaker.save();
//     res.status(201).json(savedSpeaker);
//   } catch (error) {
//     console.error("Error creating speaker:", error);
//     next(error);
//   }
// };

// const updateSpeaker = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { name, bio, email, CoName, occupation } = req.body;
//     if (!name || !email) {
//       return next(errorHandler(400, "Speaker name and email are required"));
//     }

//     let imageUrl = undefined;
//     if (req.file) {
//       imageUrl = `/uploads/${req.file.filename}`;
//     }

//     const updatedSpeaker = await Speaker.findByIdAndUpdate(
//       id,
//       {
//         name,
//         bio,
//         email,
//         image: imageUrl,
//         CoName,
//         occupation,
//         updatedAt: Date.now(),
//       },
//       { new: true, runValidators: true }
//     );

//     if (!updatedSpeaker) {
//       return next(errorHandler(404, "Speaker not found"));
//     }

//     res.status(200).json(updatedSpeaker);
//   } catch (error) {
//     console.error("Error updating speaker:", error);
//     next(error);
//   }
// };

// const getSpeakerById = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     let speaker = await Speaker.findById(id);

//     if (!speaker) {
//       return next(errorHandler(404, "Speaker not found"));
//     }

//     // Only populate if Event model is available
//     if (mongoose.models.Event) {
//       speaker = await speaker.populate("pastEvents", "title date");
//     } else {
//       console.warn(
//         "Event model not available. pastEvents will not be populated."
//       );
//     }

//     res.status(200).json(speaker);
//   } catch (error) {
//     console.error("Error retrieving speaker:", error);
//     next(error);
//   }
// };

// const getAllSpeakers = async (req, res, next) => {
//   try {
//     const speakers = await Speaker.find({}).select("-pastEvents");
//     res.status(200).json(speakers);
//   } catch (error) {
//     console.error("Error retrieving speakers:", error);
//     next(error);
//   }
// };

// const deleteSpeaker = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const deletedSpeaker = await Speaker.findByIdAndDelete(id);
//     if (!deletedSpeaker) {
//       return next(errorHandler(404, "Speaker not found"));
//     }
//     res.status(200).json({ message: "Speaker deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting speaker:", error);
//     next(error);
//   }
// };

// const addPastEvent = async (req, res, next) => {
//   try {
//     const { speakerId, eventId } = req.params;
//     const speaker = await Speaker.findById(speakerId);
//     if (!speaker) {
//       return next(errorHandler(404, "Speaker not found"));
//     }
//     if (!speaker.pastEvents.includes(eventId)) {
//       speaker.pastEvents.push(eventId);
//       await speaker.save();
//     }
//     res.status(200).json({ message: "Past event added successfully" });
//   } catch (error) {
//     console.error("Error adding past event:", error);
//     next(error);
//   }
// };

// module.exports = {
//   createSpeaker,
//   updateSpeaker,
//   getSpeakerById,
//   getAllSpeakers,
//   deleteSpeaker,
//   addPastEvent,
// };
const Speaker = require("../models/speakerModel");
const Event = require("../models/eventsModel");
const { errorHandler } = require("../middlewares/errorHandling");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file, folder = "Credulen/speakers") => {
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

const createSpeaker = async (req, res, next) => {
  try {
    const { name, bio, email, CoName, occupation } = req.body;

    if (!name || !email) {
      return next(errorHandler(400, "Speaker name and email are required"));
    }

    const existingSpeaker = await Speaker.findOne({
      $or: [{ name }, { email }],
    });
    if (existingSpeaker) {
      return next(
        errorHandler(400, "Speaker with the same name or email already exists")
      );
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

    const newSpeaker = new Speaker({
      name,
      bio,
      email,
      image: imageUrl,
      CoName,
      occupation,
    });

    const savedSpeaker = await newSpeaker.save();
    res.status(201).json(savedSpeaker);
  } catch (error) {
    console.error("Error creating speaker:", error);
    next(error);
  }
};

const updateSpeaker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, bio, email, CoName, occupation } = req.body;

    if (!name || !email) {
      return next(errorHandler(400, "Speaker name and email are required"));
    }

    const existingSpeaker = await Speaker.findById(id);
    if (!existingSpeaker) {
      return next(errorHandler(404, "Speaker not found"));
    }

    // Handle image update
    let imageUrl = existingSpeaker.image;
    if (req.files && req.files.image) {
      try {
        // Delete old image if it exists
        if (existingSpeaker.image) {
          await deleteFromCloudinary(existingSpeaker.image);
        }
        // Upload new image
        imageUrl = await uploadToCloudinary(req.files.image);
      } catch (uploadError) {
        return next(
          errorHandler(500, `Image upload failed: ${uploadError.message}`)
        );
      }
    }

    const updatedSpeaker = await Speaker.findByIdAndUpdate(
      id,
      {
        name,
        bio,
        email,
        image: imageUrl,
        CoName,
        occupation,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedSpeaker);
  } catch (error) {
    console.error("Error updating speaker:", error);
    next(error);
  }
};

const deleteSpeaker = async (req, res, next) => {
  try {
    const { id } = req.params;

    const speaker = await Speaker.findById(id);
    if (!speaker) {
      return next(errorHandler(404, "Speaker not found"));
    }

    // Delete image from Cloudinary if it exists
    if (speaker.image) {
      await deleteFromCloudinary(speaker.image);
    }

    // Delete speaker from database
    await Speaker.findByIdAndDelete(id);
    res.status(200).json({ message: "Speaker deleted successfully" });
  } catch (error) {
    console.error("Error deleting speaker:", error);
    next(error);
  }
};

// Keep existing methods unchanged
const getSpeakerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let speaker = await Speaker.findById(id);
    if (!speaker) {
      return next(errorHandler(404, "Speaker not found"));
    }
    if (mongoose.models.Event) {
      speaker = await speaker.populate("pastEvents", "title date");
    } else {
      console.warn(
        "Event model not available. pastEvents will not be populated."
      );
    }
    res.status(200).json(speaker);
  } catch (error) {
    console.error("Error retrieving speaker:", error);
    next(error);
  }
};

const getAllSpeakers = async (req, res, next) => {
  try {
    const speakers = await Speaker.find({}).select("-pastEvents");
    res.status(200).json(speakers);
  } catch (error) {
    console.error("Error retrieving speakers:", error);
    next(error);
  }
};

const addPastEvent = async (req, res, next) => {
  try {
    const { speakerId, eventId } = req.params;
    const speaker = await Speaker.findById(speakerId);
    if (!speaker) {
      return next(errorHandler(404, "Speaker not found"));
    }
    if (!speaker.pastEvents.includes(eventId)) {
      speaker.pastEvents.push(eventId);
      await speaker.save();
    }
    res.status(200).json({ message: "Past event added successfully" });
  } catch (error) {
    console.error("Error adding past event:", error);
    next(error);
  }
};

module.exports = {
  createSpeaker,
  updateSpeaker,
  getSpeakerById,
  getAllSpeakers,
  deleteSpeaker,
  addPastEvent,
};
