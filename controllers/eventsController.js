const Event = require("../models/eventsModel");
const Speaker = require("../models/speakerModel"); // Assuming you have a Speaker model
const { errorHandler } = require("../middlewares/errorHandling");
const EventRegistration = require("../models/registerEventModel");
const SolutionForm = require("../models/solutionFormModel");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file, folder = "Credulen/events") => {
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

const { sendEventConfirmationEmail } = require("../config/eventRegmail");

// Create a new event
const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      eventType,
      description,
      videoUrl,
      category,
      date,
      venue,
      meetingId,
      passcode,
      duration,
      meetingLink,
      organizer,
      speakers,
    } = req.body;

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

    const slug = title
      .split(" ")
      .join("-")
      .toLowerCase()
      .replace(/[^a-zA-Z0-9-]/g, "");

    // Parse speakers array
    let parsedSpeakers = [];
    if (speakers && speakers !== "[]") {
      try {
        parsedSpeakers = JSON.parse(speakers);
      } catch (error) {
        console.error("Error parsing speakers:", error);
      }
    }

    // Verify that all speaker IDs are valid
    if (parsedSpeakers.length > 0) {
      const validSpeakers = await Speaker.find({
        _id: { $in: parsedSpeakers },
      });
      if (validSpeakers.length !== parsedSpeakers.length) {
        return next(errorHandler(400, "One or more speaker IDs are invalid"));
      }
    }

    const newEvent = new Event({
      title,
      eventType,
      content: description,
      category,
      videoUrl,
      date,
      venue,
      meetingId,
      passcode,
      duration,
      meetingLink,
      organizer,
      speakers: parsedSpeakers,
      image: imageUrl,
      slug,
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error("Error in createEvent:", error);
    next(error);
  }
};

// Get all events with filtering and pagination
const getEvents = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 9;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const query = {
      ...(req.query.category && { category: req.query.category }),
      ...(req.query.eventType && { eventType: req.query.eventType }),
      ...(req.query.searchTerm && {
        $or: [
          { title: { $regex: req.query.searchTerm, $options: "i" } },
          { content: { $regex: req.query.searchTerm, $options: "i" } },
        ],
      }),
    };

    const events = await Event.find(query)
      .sort({ date: sortDirection })
      .skip(startIndex)
      .limit(limit)
      .populate("organizer", "name image")
      .populate("speakers", "name image bio"); // Populate speakers

    const totalEvents = await Event.countDocuments(query);

    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const lastMonthEvents = await Event.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      events,
      totalEvents,
      lastMonthEvents,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single event by ID
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate("organizer", "name image")
      .populate("speakers", "name image bio occupation CoName"); // Populate speakers
    if (!event) {
      return next(errorHandler(404, "Event not found"));
    }
    res.status(200).json(event);
  } catch (error) {
    next(error);
  }
};

// Get a single event by slug
const getEventBySlug = async (req, res, next) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug })
      .populate("organizer", "name image")
      .populate("speakers", "name image bio occupation CoName"); // Populate speakers
    if (!event) {
      return next(errorHandler(404, "Event not found"));
    }
    res.status(200).json(event);
  } catch (error) {
    next(error);
  }
};

// Update an event
const updateEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const {
      title,
      eventType,
      description,
      videoUrl,
      category,
      date,
      meetingId,
      passcode,
      duration,
      meetingLink,
      venue,
      speakers,
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return next(errorHandler(404, "Event not found"));
    }

    // Handle image update
    let imageUrl = event.image;
    if (req.files && req.files.image) {
      try {
        // Delete old image if it exists
        if (event.image) {
          await deleteFromCloudinary(event.image);
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
      .split(" ")
      .join("-")
      .toLowerCase()
      .replace(/[^a-zA-Z0-9-]/g, "");

    // Parse speakers array if it's a string
    let parsedSpeakers = speakers;
    if (typeof speakers === "string") {
      try {
        parsedSpeakers = JSON.parse(speakers);
      } catch (error) {
        console.error("Error parsing speakers:", error);
        return next(errorHandler(400, "Invalid speakers format"));
      }
    }

    // Verify that all speaker IDs are valid
    if (parsedSpeakers && parsedSpeakers.length > 0) {
      const validSpeakers = await Speaker.find({
        _id: { $in: parsedSpeakers },
      });
      if (validSpeakers.length !== parsedSpeakers.length) {
        return next(errorHandler(400, "One or more speaker IDs are invalid"));
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      {
        title,
        eventType,
        content: description,
        category,
        videoUrl,
        date,
        venue,
        meetingId,
        passcode,
        duration,
        meetingLink,
        image: imageUrl,
        slug,
        speakers: parsedSpeakers,
        updatedAt: Date.now(),
      },
      { new: true }
    );

    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error("Error in updateEvent:", error);
    next(error);
  }
};

// Delete an event
const deleteEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return next(errorHandler(404, "Event not found"));
    }

    // Delete image from Cloudinary if it exists
    if (event.image) {
      await deleteFromCloudinary(event.image);
    }

    // Delete event from database
    await Event.findByIdAndDelete(eventId);
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    next(error);
  }
};

const getRelatedEvents = async (req, res, next) => {
  try {
    const { category, currentEventId } = req.query;
    console.log("Received query params:", { category, currentEventId });

    if (!category || !currentEventId) {
      console.error("Missing required parameters:", {
        category,
        currentEventId,
      });
      return res
        .status(400)
        .json({ error: "Category and current event ID are required" });
    }

    const relatedEvents = await Event.find({
      $or: [{ category: category }, { eventType: category }],
      _id: { $ne: currentEventId },
    })
      .select("title content image slug eventType date venue videoUrl")
      .limit(4)
      .populate("organizer", "name image");

    console.log(`Found ${relatedEvents.length} related events`);

    res.status(200).json(relatedEvents);
  } catch (error) {
    console.error("Error in getRelatedEvents:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ error: "Internal server error" });
  }
};

// const registerEvent = async (req, res) => {
//   try {
//     const {
//       fullName,
//       email,
//       company,
//       reason,
//       eventTitle,
//       eventCategory,
//       slug,
//     } = req.body;

//     // Check for existing registration
//     const existingRegistration = await EventRegistration.findOne({
//       email,
//       slug,
//     });

//     if (existingRegistration) {
//       return res
//         .status(400)
//         .json({ message: "You are already registered for this event." });
//     }

//     // Create a new registration
//     const newRegistration = new EventRegistration({
//       fullName,
//       email,
//       company,
//       reason,
//       eventTitle,
//       eventCategory,
//       slug,
//     });

//     // Save the registration
//     await newRegistration.save();

//     // Fetch the event details to check the date
//     const event = await Event.findOne({ slug })
//       .populate("organizer", "name image") // Populate organizer details
//       .populate("speakers", "name image bio"); // Populate speakers details

//     if (!event) {
//       return res.status(404).json({ message: "Event not found." });
//     }

//     // Check if the event date is in the future
//     const eventDate = new Date(event.date);
//     const now = new Date();

//     if (eventDate > now) {
//       // Send confirmation email
//       try {
//         await sendEventConfirmationEmail({
//           fullName,
//           email,
//           eventTitle,
//           eventCategory,
//           venue: event.venue, // Pass venue
//           meetingId: event.meetingId, // Pass meeting ID
//           passcode: event.passcode, // Pass passcode
//           duration: event.duration, // Pass duration
//           meetingLink: event.meetingLink, // Pass meeting link
//           eventDate: event.date, // Pass event date
//         });
//       } catch (emailError) {
//         console.error("Failed to send confirmation email:", emailError);
//         // Optionally, you can log this error or handle it as needed
//       }
//     }

//     // Send success response
//     res.status(201).json({ message: "Registration successful" });
//   } catch (error) {
//     console.error("Error registering for event:", error);
//     res
//       .status(500)
//       .json({ message: "An error occurred while registering for the event" });
//   }
// };

const registerEvent = async (req, res) => {
  try {
    const {
      fullName,
      email,
      mobileNumber,
      countryOfResidence,
      careerStatus,
      interestAndAim,
      managesImmigrantCommunity,
      company,
      reason, // Retained for backward compatibility, can be removed if redundant
      eventTitle,
      eventCategory,
      slug,
    } = req.body;

    // Check for existing registration
    const existingRegistration = await EventRegistration.findOne({
      email,
      slug,
    });

    if (existingRegistration) {
      return res
        .status(400)
        .json({ message: "You are already registered for this event." });
    }

    // Create a new registration
    const newRegistration = new EventRegistration({
      fullName,
      email,
      mobileNumber,
      countryOfResidence,
      careerStatus,
      interestAndAim,
      managesImmigrantCommunity,
      company,
      eventTitle,
      eventCategory,
      slug,
    });

    // Save the registration
    await newRegistration.save();

    // Fetch the event details to check the date
    const event = await Event.findOne({ slug })
      .populate("organizer", "name image")
      .populate("speakers", "name image bio");

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Check if the event date is in the future
    const eventDate = new Date(event.date);
    const now = new Date();

    if (eventDate > now) {
      // Send confirmation email with updated fields
      try {
        await sendEventConfirmationEmail({
          fullName,
          email,
          mobileNumber, // Added to email
          countryOfResidence, // Added to email
          eventTitle,
          eventCategory,
          venue: event.venue,
          meetingId: event.meetingId,
          passcode: event.passcode,
          duration: event.duration,
          meetingLink: event.meetingLink,
          eventDate: event.date,
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }
    }

    // Send success response
    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.error("Error registering for event:", error);
    res
      .status(500)
      .json({ message: "An error occurred while registering for the event" });
  }
};

const verifyRegistration = async (req, res) => {
  try {
    const { email, slug } = req.body;

    if (!email || !slug) {
      return res.status(400).json({
        message: "Email and event slug are required.",
      });
    }

    // Find registration matching the email and event slug
    const registration = await EventRegistration.findOne({
      email: email.toLowerCase(), // Convert to lowercase for case-insensitive matching
      slug: slug,
    });

    // If no registration found
    if (!registration) {
      return res.status(404).json({
        message:
          "No registration found for this email address. Please register first.",
      });
    }

    // Get the event details to verify if it's a past event with video
    const event = await Event.findOne({ slug: slug });

    if (!event) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    // Check if event is past and has video
    const isPastEvent = new Date(event.date) < new Date();
    if (!isPastEvent || !event.videoUrl) {
      return res.status(400).json({
        message: "Video is not available for this event.",
      });
    }

    // If all checks pass, return success
    res.status(200).json({
      message: "Verification successful",
      data: {
        fullName: registration.fullName,
        eventTitle: registration.eventTitle,
        registrationDate: registration.createdAt,
      },
    });
  } catch (error) {
    console.error("Error verifying registration:", error);
    res.status(500).json({
      message: "An error occurred while verifying registration.",
    });
  }
};
// const getAllRegisteredEvents = async (req, res, next) => {
//   try {
//     const startIndex = parseInt(req.query.startIndex, 50) || 0;
//     const limit = parseInt(req.query.limit, 50) || 50;
//     const { eventTitle } = req.query;

//     // Create filter object
//     const filter = {};
//     if (eventTitle) {
//       filter.eventTitle = eventTitle;
//     }

//     // Apply filter to queries
//     const registrations = await EventRegistration.find(filter)
//       .sort({ createdAt: -1 }) // Sort by newest first
//       .skip(startIndex)
//       .limit(limit);

//     // Count should also respect the filter
//     const totalRegistrations = await EventRegistration.countDocuments(filter);

//     // Get total registrations for the filtered event
//     const filteredCount = eventTitle
//       ? await EventRegistration.countDocuments({ eventTitle })
//       : totalRegistrations;

//     res.status(200).json({
//       registrations,
//       totalRegistrations: filteredCount,
//       hasMore: registrations.length === limit,
//     });
//   } catch (error) {
//     console.error("Error getting registered events:", error);
//     res.status(500).json({
//       message: "An error occurred while fetching registered events",
//     });
//   }
// };
const getAllRegisteredEvents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1
    const limit = parseInt(req.query.limit, 10) || 50; // Default to 50
    const { eventTitle } = req.query;

    // Create filter object
    const filter = {};
    if (eventTitle) {
      filter.eventTitle = eventTitle;
    }

    // Calculate startIndex from page
    const startIndex = (page - 1) * limit;

    // Apply filter to queries
    const registrations = await EventRegistration.find(filter)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(startIndex)
      .limit(limit);

    // Count should also respect the filter
    const totalRegistrations = await EventRegistration.countDocuments(filter);

    // Total pages
    const totalPages = Math.ceil(totalRegistrations / limit);

    res.status(200).json({
      registrations,
      totalRegistrations,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error getting registered events:", error);
    res.status(500).json({
      message: "An error occurred while fetching registered events",
    });
  }
};
const handleDeleteByEvent = async (req, res, next) => {
  try {
    const { eventTitle } = req.body;

    // Validate request body
    if (!eventTitle) {
      return res.status(400).json({
        success: false,
        message: "Event title is required",
      });
    }

    // Find and delete all registrations for the specified event
    const result = await EventRegistration.deleteMany({ eventTitle });

    // Check if any documents were deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No registrations found for the specified event",
      });
    }

    // Return success response with number of deleted registrations
    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} registration(s) for event: ${eventTitle}`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting event registrations:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting event registrations",
      error: error.message,
    });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  getEventBySlug,
  updateEvent,
  deleteEvent,
  getRelatedEvents,
  registerEvent,
  verifyRegistration,
  getAllRegisteredEvents,
  handleDeleteByEvent,
};
