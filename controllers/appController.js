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

    const passwordRegex = /^[A-Za-z\d@$!%*?&]{6}$/;

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
    const passwordRegex = /^\d{6,}$/; // Regex for at least 6 digits
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

//     const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "30d",
//     });
//     const refreshToken = jwt.sign(
//       { _id: user._id },
//       process.env.JWT_REFRESH_SECRET,
//       { expiresIn: "30d" }
//     );

//     // Update or create refresh token entry
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

//     res.json({
//       token,
//       refreshToken,
//       user: {
//         _id: user._id,
//         username: user.username,
//         email: user.email,
//       },
//     });
//   } catch (error) {
//     console.error("Login Error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// const login = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const user = await UserModel.findOne({ email });
//     if (!user || !(await bcrypt.compare(password, user.password))) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     if (user.role === "admin") {
//       // If the user is an admin, send OTP
//       await sendOTP(email);
//       return res.status(200).json({ message: "OTP sent to your email" });
//     }

//     // Generate tokens for regular users
//     const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "30d",
//     });
//     const refreshToken = jwt.sign(
//       { _id: user._id },
//       process.env.JWT_REFRESH_SECRET,
//       { expiresIn: "30d" }
//     );

//     // Update or create refresh token entry
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

//     res.json({
//       token,
//       refreshToken,
//       user: {
//         _id: user._id,
//         username: user.username,
//         email: user.email,
//       },
//     });
//   } catch (error) {
//     console.error("Login Error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate tokens for admin or regular users
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    const refreshToken = jwt.sign(
      { _id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    // Update or create refresh token entry for regular users
    if (user.role !== "admin") {
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
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    }

    // If the user is an admin, send OTP
    // await sendOTP(email);

    res.status(200).json({
      // message: "OTP sent to your email",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifAdminyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await UserModel.findOne({ email, role: "admin" });
    if (!user) return res.status(401).json({ message: "Admin not found" });

    if (user.otp !== otp || Date.now() > user.otpExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
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

async function verifyUser(req, res, next) {
  try {
    const { email } = req.method === "GET" ? req.query : req.body;

    // Ensure email is provided
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if user exists
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Attach user to request object if needed
    req.user = user;

    next();
  } catch (error) {
    console.error("Verification error:", error.message); // Log error details for debugging
    return res.status(500).json({ error: "Internal server error" });
  }
}

const generateOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No user found with this email" });
    }

    const OTP = otpGenerator.generate(6, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    req.app.locals.OTP = OTP;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "petersonzoconis@gmail.com",
        pass: "hszatxfpiebzavdd",
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP for Password Recovery",
      text: `Your OTP for password recovery is ${OTP}.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).send({ code: OTP });
  } catch (error) {
    console.error("Error generating OTP:", error);
    res.status(500).json({ message: "Failed to generate OTP" });
  }
});

const verifyOTP = asyncHandler(async (req, res) => {
  try {
    const { code } = req.query;
    const storedOTP = req.app.locals.OTP;

    if (!storedOTP) {
      return res
        .status(400)
        .send({ error: "No OTP stored in the application" });
    }

    if (parseInt(storedOTP) === parseInt(code)) {
      req.app.locals.OTP = null;
      req.app.locals.resetSession = true;
      return res.status(200).json({ message: "OTP verified successfully" });
    } else {
      return res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).send({ error: "Failed to verify OTP" });
  }
});

const createResetSession = asyncHandler(async (req, res) => {
  try {
    const { code } = req.query;
    const verificationResult = await verifyOTP(req, res);

    if (verificationResult.status === 200) {
      const { email, password } = req.body;
      const user = await UserModel.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await UserModel.updateOne({ email }, { password: hashedPassword });

      return res.status(201).send({ message: "Password reset successfully" });
    } else if (verificationResult.status === 400) {
      return res.status(400).send({ error: "Invalid OTP" });
    } else {
      throw new Error("OTP verification failed");
    }
  } catch (error) {
    console.error("Error during password reset:", error);
    return res.status(500).send({ error: "Failed to reset password" });
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  try {
    if (!req.app.locals.resetSession)
      return res.status(401).json({ message: "Session expired!" });

    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "User not found!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await UserModel.updateOne(
      { email: user.email },
      { password: hashedPassword }
    );

    req.app.locals.resetSession = false;

    return res.status(201).json({
      message: "Password updated successfully!! You can now login",
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = {
  verifyUser,
  registerUser,
  registerAdmin,
  login,
  generateOTP,
  verifyOTP,
  createResetSession,
  resetPassword,
  refreshToken,
  verifAdminyOTP,
};
