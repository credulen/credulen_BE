const UserModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const validator = require("validator");
const crypto = require("crypto");

dotenv.config();

// Default JWT_SECRET if not set in .env
const JWT_SECRET = process.env.JWT_SECRET || "Qwe123123";

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Generate OTP
const generateOTP = () => {
  return otpGenerator.generate(6, {
    digits: true,
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Login Authentication OTP",
    html: `
      <h2>Login Authentication Code</h2>
      <p>Your one-time password (OTP) for login is:</p>
      <h3>${otp}</h3>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP ${otp} sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error.message);
    throw new Error("Failed to send OTP email");
  }
};

const generateToken = (userId) => {
  const payload = {
    id: userId, // Matches auth middleware expectation
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "10d" });

  // Log token details
  const decoded = jwt.decode(token);
  console.log("Generated token:", token);
  console.log("Token payload:", decoded);
  console.log("Issued at:", new Date(decoded.iat * 1000).toISOString());
  console.log("Expires at:", new Date(decoded.exp * 1000).toISOString());
  console.log("Validity (ms):", decoded.exp * 1000 - decoded.iat * 1000);
  console.log("Time left (ms):", decoded.exp * 1000 - Date.now());

  return token;
};

// / Middleware to check if requester is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Convert user to agent by email
const convertToAgent = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email || !require("validator").isEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "user" || user.agentId) {
      return res
        .status(400)
        .json({ message: "User is not eligible to become an agent" });
    }

    // Generate unique agentId (10-character uppercase hex)
    let agentId;
    let isUnique = false;
    while (!isUnique) {
      agentId = crypto.randomBytes(5).toString("hex").toUpperCase();
      const existing = await UserModel.findOne({ agentId });
      if (!existing) isUnique = true;
    }

    user.role = "agent";
    user.agentId = agentId;
    await user.save();

    console.log(`User ${user._id} converted to agent with ID: ${agentId}`);
    res.status(200).json({
      message: "User successfully converted to agent",
      agentId,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        agentId: user.agentId,
      },
    });
  } catch (error) {
    console.error("Error converting user to agent:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Register User
// const registerUser = async (req, res) => {
//   const { email, password, username } = req.body;
//   const { agentId: agentCode } = req.query;
//   try {
//     if (!validator.isEmail(email)) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

//     if (!password || !username) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const passwordRegex = /^.{6,}$/;
//     if (!passwordRegex.test(password)) {
//       return res
//         .status(400)
//         .json({ message: "Password must be at least 6 digits long" });
//     }

//     const existingUser = await UserModel.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "Existing User with this Email" });
//     }

//     const existingUserName = await UserModel.findOne({ username });
//     if (existingUserName) {
//       return res
//         .status(400)
//         .json({ message: "Existing User with this Username" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     let referredBy = null;
//     if (agentCode) {
//       const agent = await UserModel.findOne({
//         agentId: agentCode,
//         role: "agent",
//       });
//       if (agent) {
//         referredBy = agent._id;
//         // Optionally, push to agent's referrals array
//         agent.referrals.push(newUser._id); // But newUser not saved yet, so do after save
//       } else {
//         console.log(`Invalid agent code: ${agentCode}`);
//       }
//     }

//     const newUser = new UserModel({
//       email,
//       password: hashedPassword,
//       username,
//       role: "user",
//       referredBy,
//     });

//     await newUser.save();
//     if (referredBy) {
//       await UserModel.findByIdAndUpdate(referredBy, {
//         $push: { referrals: newUser._id },
//       });
//     }

//     const token = generateToken(newUser._id);

//     console.log("User registered:", newUser._id);
//     res.status(201).json({
//       token,
//       user: {
//         _id: newUser._id,
//         email: newUser.email,
//         username: newUser.username,
//         role: newUser.role,
//       },
//     });
//   } catch (error) {
//     console.error("Error during registration:", error.message);
//     if (error.code === 11000) {
//       return res.status(400).json({ message: "User already exists" });
//     }
//     res.status(500).json({ message: error.message });
//   }
// };

const registerUser = async (req, res) => {
  const { email, password, username, agentCode: bodyAgentCode } = req.body;
  const { agentId: queryAgentCode } = req.query;
  const agentCode = queryAgentCode || bodyAgentCode; // Prioritize query parameter

  try {
    // Validate email
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate required fields
    if (!password || !username) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Validate password
    const passwordRegex = /^.{6,}$/;
    if (!passwordRegex.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Validate agentCode if provided
    if (agentCode && !/^[a-zA-Z0-9]{5,15}$/.test(agentCode)) {
      console.log(`Invalid agent code format: ${agentCode}`);
      return res
        .status(400)
        .json({ message: "Agent code must be 5-15 alphanumeric characters" });
    }

    // Check for existing user
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const existingUserName = await UserModel.findOne({ username });
    if (existingUserName) {
      return res.status(400).json({ message: "Username already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle referral
    let referredBy = null;
    if (agentCode) {
      const agent = await UserModel.findOne({
        agentId: { $regex: `^${agentCode}$`, $options: "i" }, // Case-insensitive
        role: "agent",
      });
      if (!agent) {
        console.log(`No agent found for agentCode: ${agentCode}`);
        return res.status(400).json({ message: "Invalid agent code" });
      }
      console.log(`Agent found: ${agent._id}, agentId: ${agent.agentId}`);
      referredBy = agent._id;
    } else {
      console.log("No agent code provided");
    }

    // Create new user
    const newUser = new UserModel({
      email,
      password: hashedPassword,
      username,
      role: "user",
      referredBy,
    });

    await newUser.save();
    console.log(
      `New user saved: ${newUser._id}, referredBy: ${newUser.referredBy}`
    );

    // Update agent's referrals if applicable
    if (referredBy) {
      const updateResult = await UserModel.findByIdAndUpdate(
        referredBy,
        { $push: { referrals: newUser._id } },
        { new: true }
      );
      if (!updateResult) {
        console.error(`Failed to update referrals for agent: ${referredBy}`);
      } else {
        console.log(
          `Referrals updated for agent: ${referredBy}, new referral: ${newUser._id}`
        );
      }
    }

    const token = generateToken(newUser._id);

    console.log("User registered:", newUser._id);
    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        referredBy: newUser.referredBy,
      },
    });
  } catch (error) {
    console.error("Error during registration:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Register Admin
const registerAdmin = async (req, res) => {
  const { email, password, username } = req.body;

  try {
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const passwordRegex = /^.{6,}$/;
    if (!passwordRegex.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 digits long" });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new UserModel({
      email,
      password: hashedPassword,
      username,
      role: "admin",
    });

    await newAdmin.save();

    const token = generateToken(newAdmin._id);

    console.log("Admin registered:", newAdmin._id);
    res.status(201).json({
      token,
      user: {
        _id: newAdmin._id,
        email: newAdmin.email,
        username: newAdmin.username,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error("Error during admin registration:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for email:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const userData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    console.log("User authenticated:", userData);

    if (user.role === "admin") {
      try {
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        await sendOTPEmail(email, otp);

        console.log("OTP required for admin:", { email, otp });
        return res.status(200).json({
          message: "OTP sent to your email",
          requireOTP: true,
          user: userData,
        });
      } catch (error) {
        console.error("OTP generation/sending error:", error.message);
        return res.status(500).json({ message: "Failed to send OTP" });
      }
    }

    const token = generateToken(user._id);

    console.log("Login successful, sending response with token");
    return res.status(200).json({
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify Admin OTP
const verifyAdminOTP = async (req, res) => {
  const { userId, email, otp } = req.body;

  if (!otp) {
    return res.status(400).json({ message: "OTP is required" });
  }

  try {
    let query = {
      role: "admin",
      otp,
      otpExpiresAt: { $gt: Date.now() },
    };

    if (userId) {
      query._id = userId;
    } else if (email) {
      query.email = email;
    } else {
      return res
        .status(400)
        .json({ message: "Either userId or email is required" });
    }

    const user = await UserModel.findOne(query);

    if (!user) {
      console.log("Invalid or expired OTP for:", { userId, email });
      return res.status(401).json({
        message: "Invalid or expired OTP",
      });
    }

    if (user.otp !== otp) {
      console.log("OTP mismatch for:", { userId, email });
      return res.status(401).json({
        message: "Invalid OTP",
      });
    }

    const token = generateToken(user._id);

    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    console.log("OTP verified, token generated for admin:", user._id);
    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error during OTP verification:", error.message);
    return res.status(500).json({
      message: "Internal server error",
      details: error.message,
    });
  }
};

// Logout (token-based logout is client-side, so this is just a placeholder)
const logout = (req, res) => {
  console.log("User logged out");
  res.status(200).json({ message: "Successfully logged out" });
};

// Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      console.log("User not found for forgot password:", email);
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    console.log("Reset token generated:", resetToken);
    console.log(
      "Reset token expires at:",
      new Date(user.resetPasswordExpires).toISOString()
    );

    const frontendURL =
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:5173";

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
    console.log("Reset password email sent to:", email);
    res.status(200).json({ message: "Reset password email sent" });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({ message: "Error in forgot password process" });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log("Invalid or expired reset token:", token);
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

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Your password has been changed",
      text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`,
    };
    await transporter.sendMail(mailOptions);

    console.log("Password reset successful for:", user.email);
    res.status(200).json({ message: "Password has been reset" });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ message: "Error in reset password process" });
  }
};

// Google Login
const handleGoogleLogin = async (req, res) => {
  const { credential } = req.body;

  try {
    const decoded = jwt.decode(credential);

    if (!decoded) {
      console.log("Invalid Google token received");
      return res.status(400).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    let user = await UserModel.findOne({ email: decoded.email });

    if (user && user.role === "admin") {
      console.log("Admin attempted Google login:", decoded.email);
      return res.status(403).json({
        success: false,
        message:
          "Admin accounts cannot login through Google authentication. Please use the standard login route.",
      });
    }

    if (!user) {
      user = new UserModel({
        email: decoded.email,
        username: decoded.name,
        googleId: decoded.sub,
        picture: decoded.picture,
        role: "user",
      });
      await user.save();
      console.log("New Google user created:", user._id);
    }

    const token = generateToken(user._id);

    console.log("Google login successful for:", user.email);
    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("Google login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error processing Google login",
    });
  }
};

module.exports = {
  registerUser,
  convertToAgent,
  registerAdmin,
  login,
  forgotPassword,
  resetPassword,
  verifyAdminOTP,
  handleGoogleLogin,
  logout,
};
