// routes/joinCommunityRoutes.js
const express = require("express");
const router = express.Router();
const {
  registerJoinCommunity,
  getAllRegistrations,
  getRegistration,
  deleteRegistration,
} = require("../controllers/joincommunityController");

// Public routes
router.post("/registerJoinCommunity", registerJoinCommunity);

router.get("/getAllRegistrations", getAllRegistrations);

router.get("/getRegistration/:id", getRegistration);

router.delete("/deleteRegistration/:id", deleteRegistration);

module.exports = router;
