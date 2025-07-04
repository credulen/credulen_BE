const axios = require("axios");
const logger = require("../config/logger");
const WebinarPayment = require("../models/webinarPaymentModel");
const Webinar = require("../models/webinarDetailsModel");
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateEmailTemplate = (data) => {
  return `
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Webinar Payment Confirmation</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Inter', Arial, sans-serif;
            background-color: #F3F4F6;
            line-height: 1.6;
          }
          a {
            text-decoration: none;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #0F0B78;
            color: white;
            border-radius: 6px;
            font-weight: 500;
            text-align: center;
            transition: background-color 0.3s ease;
          }
          .button:hover {
            background-color: #1A1A5C;
          }
        </style>
      </head>
      <body>
        <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background-color: #0F0B78; padding: 24px; text-align: center;">
              <img src='https://res.cloudinary.com/dxmiz9idd/image/upload/v1730724855/CredulenLogo_n8wexs.png' 
                   alt="Credulen Logo" 
                   style="max-width: 180px; height: auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 24px; text-align: center;">
              <h1 style="color: #0F0B78; font-size: 28px; font-weight: 700; margin-bottom: 16px;">
                Webinar Payment Confirmation
              </h1>
              <p style="color: #1A1A5C; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                Dear ${data.firstName} ${data.lastName},<br>
                Thank you for your payment! We're excited to confirm your registration for <strong>${
                  data.webinarTitle
                }</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 32px;">
              <div style="background-color: #E2FF02; border-radius: 8px; padding: 24px;">
                <h2 style="color: #0F0B78; font-size: 20px; font-weight: 600; margin-bottom: 20px;">
                  Payment Details
                </h2>
                <table cellpadding="8" cellspacing="0" width="100%">
                  <tr>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">Name:</td>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">${
                      data.firstName
                    } ${data.lastName}</td>
                  </tr>
                  <tr>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">Email:</td>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">${
                      data.email
                    }</td>
                  </tr>
                  <tr>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">Webinar:</td>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">${
                      data.webinarTitle
                    }</td>
                  </tr>
                  <tr>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">Amount:</td>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">₦${data.amount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">Transaction Date:</td>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">${new Date(
                      data.transactionDate
                    ).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">Payment Reference:</td>
                    <td style="color: #1A1A5C; font-size: 14px; text-align: left;">${
                      data.paymentReference || "Pending"
                    }</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 40px; text-align: center;">
              <p style="color: #1A1A5C; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                Our team will reach out within the next 24-48 hours to provide further details and guide you through the next steps. In the meantime, feel free to explore more on our website.
              </p>
              <a href="https://www.yourwebsite.com" class="button">
                Visit Our Website
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; font-size: 14px; line-height: 1.5; margin-top: 24px;">
                Need assistance? Contact our support team at <a href="mailto:support@yourwebsite.com" style="color: #F4A261; text-decoration: underline;">support@yourwebsite.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #E2FF02; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #1A1A5C; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Credulen. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const initiateWebinarPayment = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      webinarTitle,
      webinarSlug,
      amount,
      callback_url,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !webinarTitle ||
      !webinarSlug ||
      !amount
    ) {
      logger.warn("Missing required fields in webinar payment initiation", {
        body: req.body,
      });
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Create a new WebinarPayment document
    const webinarPayment = new WebinarPayment({
      firstName,
      lastName,
      email,
      phoneNumber,
      webinarTitle,
      webinarSlug,
      amount,
      paymentStatus: "pending",
    });

    await webinarPayment.save();

    // Initiate Paystack payment
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Convert to kobo
        callback_url,
        metadata: {
          webinarPaymentId: webinarPayment._id.toString(),
          webinarTitle,
          webinarSlug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { data } = paystackResponse.data;

    if (!data.authorization_url) {
      logger.error("No authorization URL received from Paystack");
      // Clean up: remove the pending payment if initialization fails
      await WebinarPayment.findByIdAndDelete(webinarPayment._id);
      return res.status(500).json({
        success: false,
        message: "Failed to initialize payment",
      });
    }

    // Update payment with reference
    webinarPayment.paymentReference = data.reference;
    await webinarPayment.save();

    res.json({
      success: true,
      authorization_url: data.authorization_url,
      reference: data.reference,
    });
  } catch (error) {
    logger.error(`Webinar payment initiation error: ${error.message}`, {
      stack: error.stack,
    });

    if (error.code === 11000) {
      // Handle duplicate key error (should only occur on paymentReference)
      return res.status(400).json({
        success: false,
        message:
          "A payment with this reference already exists. Please try again or contact support.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to initialize payment",
      error: error.message,
    });
  }
};

const verifyWebinarPayment = async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      logger.warn("Missing payment reference in verification request");
      return res.status(400).json({
        success: false,
        message: "Payment reference is required",
      });
    }

    // Verify payment with Paystack
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const { data } = paystackResponse.data;

    if (data.status !== "success") {
      logger.warn("Payment verification failed", {
        reference,
        status: data.status,
      });
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // Find the webinar payment
    const webinarPayment = await WebinarPayment.findOne({
      paymentReference: reference,
    });

    if (!webinarPayment) {
      logger.warn("Webinar payment not found for reference", { reference });
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Update payment status
    webinarPayment.paymentStatus = "completed";
    webinarPayment.paymentMethod = data.channel || "unknown";
    webinarPayment.transactionDate = new Date();
    await webinarPayment.save();

    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: webinarPayment.email,
      subject: "Webinar Payment Confirmation",
      html: generateEmailTemplate({
        firstName: webinarPayment.firstName,
        lastName: webinarPayment.lastName,
        email: webinarPayment.email,
        webinarTitle: webinarPayment.webinarTitle,
        amount: webinarPayment.amount,
        transactionDate: webinarPayment.transactionDate,
        paymentReference: webinarPayment.paymentReference,
      }),
    };

    await transporter.sendMail(mailOptions);
    logger.info("Payment confirmation email sent", {
      email: webinarPayment.email,
    });

    res.json({
      success: true,
      data: {
        firstName: webinarPayment.firstName,
        lastName: webinarPayment.lastName,
        email: webinarPayment.email,
        webinarTitle: webinarPayment.webinarTitle,
        amount: webinarPayment.amount,
        paymentStatus: webinarPayment.paymentStatus,
        paymentReference: webinarPayment.paymentReference,
        transactionDate: webinarPayment.transactionDate,
      },
    });
  } catch (error) {
    logger.error(`Webinar payment verification error: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

const getWebinarBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const webinar = await Webinar.findOne({ slug }).lean();

    if (!webinar) {
      logger.warn("Webinar not found", { slug });
      return res.status(404).json({
        success: false,
        message: "Webinar not found",
      });
    }

    res.json({
      success: true,
      data: webinar,
    });
  } catch (error) {
    logger.error(`Error fetching webinar: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch webinar details",
      error: error.message,
    });
  }
};

module.exports = {
  initiateWebinarPayment,
  verifyWebinarPayment,
  getWebinarBySlug,
};
