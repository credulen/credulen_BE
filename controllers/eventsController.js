const Event = require("../models/eventsModel");
const Speaker = require("../models/speakerModel"); // Assuming you have a Speaker model
const { errorHandler } = require("../middlewares/errorHandling");
const EventRegistration = require("../models/registerEventModel");
const SolutionForm = require("../models/solutionFormModel");

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
      organizer,
      speakers,
    } = req.body;

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
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
      organizer,
      speakers: parsedSpeakers,
      image: imageUrl,
      slug,
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error("Error in createEvent:", error);
    res.status(500).json({
      message: error.message || "An error occurred while creating the event",
    });
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
      venue,
      speakers,
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return next(errorHandler(404, "Event not found"));
    }

    let imageUrl = event.image;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
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

    event.title = title;
    event.eventType = eventType;
    event.content = description; // Changed from 'content' to 'description' to match createEvent
    event.category = category;
    event.videoUrl = videoUrl;
    event.date = date;
    event.venue = venue;
    event.image = imageUrl;
    event.slug = slug;
    event.speakers = parsedSpeakers;
    event.updatedAt = Date.now();

    const updatedEvent = await event.save();
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
    const deletedEvent = await Event.findByIdAndDelete(eventId);

    if (!deletedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error.message);
    next(error);
  }
};

const registerForSolution = async (req, res, next) => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      employmentStatus,
      jobTitle,
      selectedSolution,
      slug,
    } = req.body;

    // Check for existing submission
    const existingSubmission = await SolutionForm.findOne({
      email,
      slug,
    });
    if (existingSubmission) {
      return res.status(400).json({
        message: "You have already submitted a form for this solution.",
      });
    }

    const newSubmission = new SolutionForm({
      fullName,
      phoneNumber,
      email,
      employmentStatus,
      jobTitle,
      selectedSolution,
      slug,
    });

    await newSubmission.save();

    res.status(201).json({ message: "Form submitted successfully" });
  } catch (error) {
    console.error("Error submitting solution form:", error);
    res
      .status(500)
      .json({ message: "An error occurred while submitting the form" });
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

const registerEvent = async (req, res) => {
  try {
    const {
      fullName,
      email,
      company,
      reason,
      eventTitle,
      eventCategory,
      slug,
    } = req.body;

    const newRegistration = new EventRegistration({
      fullName,
      email,
      company,
      reason,
      eventTitle,
      eventCategory,
      slug,
    });

    const existingRegistration = await EventRegistration.findOne({
      email,
      slug,
    });

    // Check for existing registration
    if (existingRegistration) {
      return res
        .status(400)
        .json({ message: "You are already registered for this event." });
    }

    await newRegistration.save();

    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.error("Error registering for event:", error);
    res
      .status(500)
      .json({ message: "An error occurred while registering for the event" });
  }
};
const getAllRegisteredEvents = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { eventTitle } = req.query;

    // Create filter object
    const filter = {};
    if (eventTitle) {
      filter.eventTitle = eventTitle;
    }

    // Apply filter to queries
    const registrations = await EventRegistration.find(filter)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(startIndex)
      .limit(limit);

    // Count should also respect the filter
    const totalRegistrations = await EventRegistration.countDocuments(filter);

    // Get total registrations for the filtered event
    const filteredCount = eventTitle
      ? await EventRegistration.countDocuments({ eventTitle })
      : totalRegistrations;

    res.status(200).json({
      registrations,
      totalRegistrations: filteredCount,
      hasMore: registrations.length === limit,
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
  registerForSolution,
  getRelatedEvents,
  registerEvent,
  getAllRegisteredEvents,
  handleDeleteByEvent,
};
