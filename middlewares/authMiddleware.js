const jwt = require("jsonwebtoken");
const User = require("../models/userModel"); // Your user model

const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is set in your .env file

// Middleware to verify token
const auth = async (req, res, next) => {
  // Get token from header
  const token = req.header("Authorization")?.split(" ")[1]; // Extract token from "Bearer <token>"

  console.log("Received token in middleware:", token); // Log the raw token

  // Check if token is present
  if (!token) {
    console.log("No token provided in request");
    return res
      .status(401)
      .json({ message: "No token provided, authorization denied" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded token:", decoded); // Log the decoded payload
    console.log(
      "Token expiration:",
      new Date(decoded.exp * 1000).toLocaleString()
    ); // Log expiration date
    console.log("Time left (ms):", decoded.exp * 1000 - Date.now()); // Log time left until expiration

    // Find user by decoded id
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log("User not found for ID:", decoded.id);
      return res
        .status(401)
        .json({ message: "User not found, authorization denied" });
    }

    // Attach user to request
    req.user = user;
    console.log("User authenticated:", user._id);
    console.log("User:", user);
    next(); // Proceed to the next middleware/route handler
  } catch (err) {
    console.error("Token verification failed:", err.message); // Detailed error logging
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = auth;
