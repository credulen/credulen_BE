// const otpGenerator = require("otp-generator");
// const nodemailer = require("nodemailer");
// const UserModel = require("../models/userModel");

// // Configure your email transporter
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: "petersonzoconis@gmail.com",
//     pass: "hszatxfpiebzavdd",
//   },
// });
// const sendOTP = async (email) => {
//   try {
//     // Generate OTP
//     const otp = otpGenerator.generate(6, {
//       digits: true,
//       upperCase: false,
//       specialChars: false,
//     });

//     // Save OTP to the user record
//     const user = await UserModel.findOne({ email, role: "admin" });
//     if (!user) throw new Error("Admin not found");

//     user.otp = otp;
//     user.otpExpiresAt = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
//     await user.save();

//     // Send OTP via email
//     await transporter.sendMail({
//       to: email,
//       subject: "Your OTP Code",
//       text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
//     });
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// module.exports = { sendOTP };

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
    console.log(`[sendOTP] Generating OTP for email: ${email}`);

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCase: false,
      specialChars: false,
    });
    console.log(`[sendOTP] OTP generated: ${otp}`);

    // Find admin user by email
    const user = await UserModel.findOne({ email, role: "admin" });
    if (!user) {
      console.error(`[sendOTP] Admin not found for email: ${email}`);
      throw new Error("Admin not found");
    }

    // Save OTP and expiration to the user record
    user.otp = otp;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
    await user.save();
    console.log(`[sendOTP] OTP saved to the user record for email: ${email}`);

    // Send OTP via email
    await transporter.sendMail({
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    });
    console.log(`[sendOTP] OTP email sent successfully to: ${email}`);
  } catch (error) {
    console.error(`[sendOTP] Error occurred: ${error.message}`);
    throw new Error(error.message);
  }
};

module.exports = { sendOTP };
