const mongoose = require("mongoose");

const bannerStatusSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BannerStatus", bannerStatusSchema);
