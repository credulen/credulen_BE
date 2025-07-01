const express = require("express");
const router = express.Router();

const {
  registerCampaign,
  getAllRegistrations,
  getRegistrationById,
  deleteRegistration,
} = require("../controllers/FreeClassRegistrationController");

// Define routes for campaign registration
router.post("/registerCampaign", registerCampaign);
router.get("/getAllCampaignRegistrations", getAllRegistrations);
router.get("/getCampaignRegistration/:id", getRegistrationById);
router.delete("/deleteCampaignRegistration/:id", deleteRegistration);

module.exports = router;
