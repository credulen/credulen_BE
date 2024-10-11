const UserModel = require("../models/userModel");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const asyncHandler = require("express-async-handler");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const validator = require("validator");
const { sendOTP } = require("./otpController");
const JWT_SECRET = process.env.JWT_SECRET || "Qwe123123";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "Refresh123123";
const crypto = require("crypto");

dotenv.config();
const registerUser = async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // Validate the email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate other fields
    if (!password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Password validation

    const passwordRegex = /^.{6,}$/;

    if (!passwordRegex.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 digits long" });
    }

    // Check if the user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Existing User with this Email" });
    }
    // Check if the userNAme already exists
    const existingUserName = await UserModel.findOne({ username });
    if (existingUserName) {
      return res
        .status(400)
        .json({ message: "Existing User with this Username" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance with default role as "user"
    const newUser = new UserModel({
      email,
      password: hashedPassword,
      username,
      role: "user", // Default role
    });

    // Save the new user
    await newUser.save();

    // Generate tokens
    const token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    const refreshToken = jwt.sign(
      { _id: newUser._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    // Set the refreshToken in an HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    // Respond with the token, refreshToken, and user info
    res.status(201).json({
      token,
      refreshToken,
      user: {
        _id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error during registration:", error);

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Handle other errors
    res.status(500).json({ message: error.message });
  }
};

const registerAdmin = async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // Validate the email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate other fields
    if (!password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Password validation
    const passwordRegex = /^.{6,}$/;

    if (!passwordRegex.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 digits long" });
    }

    // Check if the user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin instance
    const newAdmin = new UserModel({
      email,
      password: hashedPassword,
      username,
      role: "admin", // Set role as "admin"
    });

    // Save the new admin
    await newAdmin.save();

    // Generate tokens
    const token = jwt.sign({ _id: newAdmin._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    const refreshToken = jwt.sign(
      { _id: newAdmin._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    // Set the refreshToken in an HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    // Respond with the token, refreshToken, and user info
    res.status(201).json({
      token,
      refreshToken,
      user: {
        _id: newAdmin._id,
        email: newAdmin.email,
        username: newAdmin.username,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error("Error during admin registration:", error);

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Handle other errors
    res.status(500).json({ message: error.message });
  }
};

// const login = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const user = await UserModel.findOne({ email });
//     if (!user || !(await bcrypt.compare(password, user.password))) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const userData = {
//       _id: user._id,
//       username: user.username,
//       email: user.email,
//       role: user.role,
//     };

//     if (user.role === "admin") {
//       const otp = otpGenerator.generate(6, {
//         upperCase: false,
//         specialChars: false,
//       });
//       user.otp = otp;
//       user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
//       await user.save();

//       await sendOTP(email, otp);

//       return res.status(200).json({
//         message: "OTP sent to your email",
//         requireOTP: true,
//         user: userData,
//       });
//     }

//     // For non-admin users, proceed with normal login
//     const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "30d",
//     });
//     const refreshToken = jwt.sign(
//       { _id: user._id },
//       process.env.JWT_REFRESH_SECRET,
//       { expiresIn: "30d" }
//     );

//     user.refreshTokens.push({
//       token: refreshToken,
//       createdAt: new Date(),
//       expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//     });
//     await user.save();

//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       sameSite: "None",
//       secure: true,
//     });

//     return res.status(200).json({
//       token,
//       refreshToken,
//       user: userData,
//     });
//   } catch (error) {
//     console.error("Login Error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// const verifAdminyOTP = async (req, res) => {
//   const { userId, otp } = req.body;
//   console.log("Received userId:", userId, "OTP:", otp);

//   try {
//     const user = await UserModel.findOne({ _id: userId, role: "admin" });
//     if (!user) return res.status(401).json({ message: "Admin not found" });

//     console.log("Stored OTP:", user.otp);
//     console.log("OTP Expiry Time:", user.otpExpiresAt);

//     if (!user.otp || !user.otpExpiresAt) {
//       return res.status(400).json({ message: "No OTP found or OTP expired" });
//     }

//     if (user.otp !== otp) {
//       return res.status(400).json({ message: "Invalid OTP" });
//     }

//     if (Date.now() > user.otpExpiresAt) {
//       return res.status(400).json({ message: "OTP has expired" });
//     }

//     if (user.otp !== otp || Date.now() > user.otpExpiresAt) {
//       return res.status(400).json({ message: "Invalid or expired OTP" });
//     }

//     // Generate tokens
//     const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "30d",
//     });
//     const refreshToken = jwt.sign(
//       { _id: user._id },
//       process.env.JWT_REFRESH_SECRET,
//       { expiresIn: "30d" }
//     );

//     // Set the refreshToken in an HTTP-only cookie
//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       sameSite: "None",
//       secure: true,
//     });

//     // Clear OTP
//     user.otp = undefined;
//     user.otpExpiresAt = undefined;
//     await user.save();

//     res.status(200).json({
//       token,
//       refreshToken,
//       user: {
//         _id: user._id,
//         email: user.email,
//         username: user.username,
//         role: user.role,
//       },
//     });

//     // LOGS
//     console.log("Stored OTP:", user.otp);
//     console.log("Received OTP:", otp);
//     console.log("OTP Expiry Time:", new Date(user.otpExpiresAt));
//   } catch (error) {
//     console.error("Error during OTP verification:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const userData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    if (user.role === "admin") {
      const otp = otpGenerator.generate(6, {
        upperCase: false,
        specialChars: false,
      });
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      await user.save();

      await sendOTP(email, otp);

      return res.status(200).json({
        message: "OTP sent to your email",
        requireOTP: true,
        user: userData,
      });
    }

    // For non-admin users, proceed with normal login
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    const refreshToken = jwt.sign(
      { _id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    return res.status(200).json({
      token,
      refreshToken,
      user: userData,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifAdminyOTP = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await UserModel.findOne({ _id: userId, role: "admin" });
    if (!user) return res.status(401).json({ message: "Admin not found" });

    if (!user.otp || !user.otpExpiresAt || Date.now() > user.otpExpiresAt) {
      return res.status(400).json({ message: "OTP has expired or is invalid" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Generate tokens
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    const refreshToken = jwt.sign(
      { _id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    // Set the refreshToken in an HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    // Clear OTP
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.status(200).json({
      token,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({ message: error.message });
  }
};
const refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies; // Retrieve refresh token from cookies

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await UserModel.findById(decoded._id);

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Check if the refresh token is valid and matches the one stored
    const isValidRefreshToken = user.refreshTokens.some(
      (tokenObj) =>
        tokenObj.token === refreshToken && tokenObj.expiresAt > Date.now()
    );

    if (!isValidRefreshToken) {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    // Generate new access token
    const newAccessToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Optionally, generate a new refresh token and update it
    const newRefreshToken = jwt.sign(
      { _id: user._id },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "30d",
      }
    );

    // Update the refresh token in the database
    user.refreshTokens = user.refreshTokens.map((tokenObj) =>
      tokenObj.token === refreshToken
        ? { ...tokenObj, token: newRefreshToken, createdAt: new Date() }
        : tokenObj
    );
    await user.save();

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({ message: "Token refresh failed" });
  }
};

logout = (req, res) => {
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Successfully logged out" });
};

// Setup Nodemailer transporter

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Logging the token and expiration
    console.log("Reset token:", resetToken);
    console.log("Token expiration time:", user.resetPasswordExpires);

    const frontendURL =
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:5173";

    // Send email
    const resetUrl = `${frontendURL}/reset-password/${resetToken}`;
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Password Reset",
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        ${resetUrl}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Reset password email sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Error in forgot password process" });
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Password reset token is invalid or has expired" });
    }

    const passwordRegex = /^.{6,}$/;
    if (!passwordRegex.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Set new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Your password has been changed",
      text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Password has been reset" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error in reset password process" });
  }
};

module.exports = {
  registerUser,
  registerAdmin,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifAdminyOTP,
};
