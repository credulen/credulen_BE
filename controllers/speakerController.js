const Speaker = require("../models/speakerModel");
const Event = require("../models/eventsModel");
const { errorHandler } = require("../middlewares/errorHandling");
const mongoose = require("mongoose");

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

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
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

    let imageUrl = undefined;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
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

    if (!updatedSpeaker) {
      return next(errorHandler(404, "Speaker not found"));
    }

    res.status(200).json(updatedSpeaker);
  } catch (error) {
    console.error("Error updating speaker:", error);
    next(error);
  }
};

const getSpeakerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let speaker = await Speaker.findById(id);

    if (!speaker) {
      return next(errorHandler(404, "Speaker not found"));
    }

    // Only populate if Event model is available
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

const deleteSpeaker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedSpeaker = await Speaker.findByIdAndDelete(id);
    if (!deletedSpeaker) {
      return next(errorHandler(404, "Speaker not found"));
    }
    res.status(200).json({ message: "Speaker deleted successfully" });
  } catch (error) {
    console.error("Error deleting speaker:", error);
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
