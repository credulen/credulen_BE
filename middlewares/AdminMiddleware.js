// middleware/adminMiddleware.js
const jwt = require("jsonwebtoken");
const UserModel = require("../models/User");

const isAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await UserModel.findById(decoded._id);
    if (!user || user.role !== "admin")
      return res.status(403).json({ message: "Forbidden" });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = isAdmin;
