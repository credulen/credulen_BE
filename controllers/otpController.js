const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const UserModel = require("../models/userModel");

// Configure your email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "petersonzoconis@gmail.com",
    pass: "hszatxfpiebzavdd",
  },
});
const sendOTP = async (email) => {
  try {
    // Generate OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCase: false,
      specialChars: false,
    });

    // Save OTP to the user record
    const user = await UserModel.findOne({ email, role: "admin" });
    if (!user) throw new Error("Admin not found");

    user.otp = otp;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
    await user.save();

    // Send OTP via email
    await transporter.sendMail({
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = { sendOTP };
