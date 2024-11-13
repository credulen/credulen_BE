// controllers/joinCommunityController.js
const Registration = require("../models/joinCommunityModel");
const BannerStatus = require("../models/bannerStatusModel");

const registerJoinCommunity = async (req, res) => {
  try {
    const { name, email, phone, enrolled } = req.body;

    // Check for existing registration
    const existingRegistration = await Registration.findOne({ email });
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: "This email has already been registered",
      });
    }

    // Create new registration
    const registration = await Registration.create({
      name,
      email,
      phone,
      enrolled,
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        name: registration.name,
        email: registration.email,
        registrationDate: registration.registrationDate,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during registration",
    });
  }
};

// Retrieve all registrations
const getAllRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({}).sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving registrations",
    });
  }
};

// Retrieve single registration
const getRegistration = async (req, res) => {
  const { id } = req.params;
  try {
    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    res.status(200).json({
      success: true,
      data: registration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving registration",
    });
  }
};

// Delete registration
const deleteRegistration = async (req, res) => {
  const { id } = req.params;
  try {
    const registration = await Registration.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    await Registration.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Registration deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting registration",
    });
  }
};

// Get banner status
const getBannerStatus = async (req, res) => {
  try {
    const status = await BannerStatus.findOne();
    res.status(200).json(status || { isActive: false }); // Default to inactive if not found
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving banner status",
    });
  }
};

// Update banner status
const updateBannerStatus = async (req, res) => {
  const { isActive } = req.body;
  try {
    await BannerStatus.findOneAndUpdate({}, { isActive }, { upsert: true });
    res.status(200).json({ message: "Banner status updated" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error updating banner status",
    });
  }
};

module.exports = {
  registerJoinCommunity,
  getAllRegistrations,
  getRegistration,
  deleteRegistration,
  getBannerStatus,
  updateBannerStatus,
};
