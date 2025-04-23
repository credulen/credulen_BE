const axios = require("axios");
const logger = require("../config/logger.js");
const Solution = require("../models/solutionFormModel");
const User = require("../models/userModel");
const PaymentNotification = require("../models/PaymentNotificationModel");
const { sendRegSuccessMail1 } = require("../config/regSucessMail.js");

// Store processed payments in the database instead of memory
const ProcessedPayment = require("../models/ProcessedPaymentModel.js");

// Helper function to send email with retry
const sendEmailWithRetry = async (emailData, retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sendRegSuccessMail1(emailData);
      logger.info(`Payment success email sent (attempt ${attempt})`, {
        email: emailData.email,
      });
      return true;
    } catch (emailError) {
      logger.error(
        `Failed to send success email (attempt ${attempt}/${retries})`,
        {
          error: emailError.message,
          email: emailData.email,
        }
      );
      if (attempt === retries) {
        logger.error("Max retries reached for sending success email", {
          email: emailData.email,
        });
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return false;
};

// Initialize Paystack payment
const initiatePaystackPayment = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      employmentStatus,
      jobTitle,
      selectedSolution,
      solutionType,
      solutionId,
      slug,
      amount,
      callback_url,
    } = req.body;

    // Validate required fields, including amount
    if (!email || !firstName || !amount || !solutionId) {
      logger.warn("Missing required fields in payment initiation", {
        body: req.body,
      });
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate amount
    if (amount <= 0) {
      logger.warn("Invalid amount in payment initiation", { amount });
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // Log the amount received (in kobo)
    logger.info("Received amount (kobo) for payment initiation", { amount });

    // Convert amount to naira for storage
    const amountInNaira = amount / 100;

    // Normalize solutionType before saving
    let normalizedSolutionType = solutionType;
    if (solutionType === "ConsultingService") {
      normalizedSolutionType = "consulting service";
    } else if (solutionType === "TrainingSchool") {
      normalizedSolutionType = "training school";
    }

    // Create registration record
    const registration = new Solution({
      firstName,
      lastName,
      email,
      phoneNumber,
      employmentStatus,
      jobTitle,
      selectedSolution,
      solutionType: normalizedSolutionType,
      solutionId,
      slug,
      amount: amountInNaira,
      paymentStatus: "pending",
    });
    await registration.save();

    // Log the amount stored (in naira)
    logger.info("Stored amount (naira) in registration", {
      amount: registration.amount,
    });

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount, // Amount in kobo for Paystack
        callback_url,
        metadata: {
          registrationId: registration._id.toString(),
          fullName: `${firstName} ${lastName}`,
          solutionId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { authorization_url, reference } = paystackResponse.data.data;

    // Update registration with reference
    registration.paymentReference = reference;
    await registration.save();

    // Find or create user
    let user = await User.findOne({ email: registration.email });
    if (!user) {
      try {
        user = new User({
          firstName: registration.firstName,
          lastName: registration.lastName,
          email: registration.email,
          phoneNumber: registration.phoneNumber,
        });
        await user.save();
        logger.info("New user created during payment initiation", {
          email: user.email,
        });
      } catch (userError) {
        logger.error("Failed to create user during payment initiation", {
          error: userError.message,
          email: registration.email,
        });
        // Continue with payment initiation even if user creation fails
        user = null;
      }
    }

    // Create notifications for user and admin
    const notifications = [
      {
        userId: user?._id || null,
        title: "Payment Initiated",
        message: `You have initiated a payment of ₦${registration.amount} for ${registration.selectedSolution}. Payment Reference: ${reference}`,
        type: "info",
        recipients: user ? [user._id.toString()] : [],
      },
      {
        userId: null,
        title: "New Payment Initiated",
        message: `A payment of ₦${registration.amount} has been initiated by ${registration.firstName} ${registration.lastName} for ${registration.selectedSolution}. Payment Reference: ${reference}`,
        type: "info",
        recipients: ["admin"],
      },
    ];

    try {
      await PaymentNotification.insertMany(notifications);
      logger.info(
        "Notifications created successfully during payment initiation",
        {
          reference,
        }
      );
    } catch (notificationError) {
      logger.error("Failed to create notifications during payment initiation", {
        error: notificationError.message,
        reference,
      });
      // Continue with payment initiation even if notifications fail
    }

    logger.info("Payment initialized successfully", { reference, email });

    res.json({
      success: true,
      authorization_url,
      reference,
    });
  } catch (error) {
    logger.error(`Payment initiation error: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to initialize payment",
      error: error.message,
    });
  }
};

// Verify Paystack payment
const verifyPaystackPayment = async (req, res) => {
  const { reference } = req.query;

  if (!reference) {
    logger.warn("No reference provided for payment verification");
    return res
      .status(400)
      .json({ success: false, message: "No reference provided" });
  }

  // Check if payment has already been processed
  const existingProcessedPayment = await ProcessedPayment.findOne({
    reference,
  });
  if (existingProcessedPayment) {
    logger.info(`Payment ${reference} already processed`);
    return res.json({ success: true, message: "Payment already processed" });
  }

  try {
    const verification = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = verification.data.data;
    const registrationId = paymentData.metadata.registrationId;

    if (paymentData.status !== "success") {
      logger.warn("Payment verification failed", {
        reference,
        status: paymentData.status,
      });
      throw new Error("Payment not successful");
    }

    const registration = await Solution.findByIdAndUpdate(
      registrationId,
      {
        paymentStatus: "completed",
        paymentReference: reference,
        paymentDate: new Date(),
        paymentMethod: paymentData.channel,
        paymentDetails: paymentData,
      },
      { new: true }
    );

    if (!registration) {
      logger.error("Registration not found", { registrationId });
      throw new Error("Registration not found");
    }

    let user = await User.findOne({ email: registration.email });
    if (!user) {
      try {
        user = new User({
          firstName: registration.firstName,
          lastName: registration.lastName,
          email: registration.email,
          phoneNumber: registration.phoneNumber,
        });
        await user.save();
        logger.info("New user created", { email: user.email });
      } catch (userError) {
        logger.error("Failed to create user during payment verification", {
          error: userError.message,
          email: registration.email,
        });
        user = null;
      }
    }

    // Send success email with retry
    const emailSent = await sendEmailWithRetry({
      firstName: registration.firstName,
      lastName: registration.lastName,
      phoneNumber: registration.phoneNumber,
      email: registration.email,
      solutionName: registration.selectedSolution,
      amount: registration.amount,
      paymentReference: reference,
      selectedSolution: registration.selectedSolution,
    });

    if (!emailSent) {
      // Log a critical error if email sending fails after retries
      logger.error("Failed to send payment success email after retries", {
        email: registration.email,
      });
      // Optionally, you could notify an admin here
    }

    // Create notifications for user and admin
    const notifications = [
      {
        userId: user?._id || null,
        title: "Payment Successful",
        message: `Your payment of ₦${registration.amount} for ${registration.selectedSolution} was successful`,
        type: "success",
        recipients: user ? [user._id.toString()] : [],
      },
      {
        userId: null,
        title: "New Payment Received",
        message: `New payment of ₦${registration.amount} received from ${registration.firstName} ${registration.lastName} for ${registration.selectedSolution}`,
        type: "info",
        recipients: ["admin"],
      },
    ];

    try {
      await PaymentNotification.insertMany(notifications);
      logger.info("Notifications created successfully", {
        userId: user?._id,
        reference,
      });
    } catch (notificationError) {
      logger.error("Failed to create notifications", {
        error: notificationError.message,
        reference,
      });
      // Continue with payment verification even if notifications fail
    }

    // Store the processed payment in the database
    await ProcessedPayment.create({
      reference,
      processedAt: new Date(),
      expiresAt: new Date(Date.now() + 1800000), // 30 minutes expiry
    });

    // Log the registration data for debugging
    logger.info("Registration data before response", {
      reference,
      registration: {
        amount: registration.amount,
        selectedSolution: registration.selectedSolution,
        email: registration.email,
        paymentDate: registration.paymentDate,
      },
    });

    logger.info("Payment verification completed successfully", { reference });
    return res.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        amount: registration.amount,
        selectedSolution: registration.selectedSolution || "N/A",
        email: registration.email || "N/A",
        paymentDate: registration.paymentDate
          ? registration.paymentDate.toLocaleDateString()
          : new Date().toLocaleDateString(),
      },
    });
  } catch (error) {
    logger.error(`Payment verification error: ${error.message}`, {
      stack: error.stack,
      reference,
    });

    const registration = await Solution.findOne({
      paymentReference: reference,
    });
    if (registration) {
      const user = await User.findOne({ email: registration.email });
      const notifications = [
        {
          userId: user?._id || null,
          title: "Payment Failed",
          message:
            "Your payment attempt failed. Please try again or contact support.",
          type: "error",
          recipients: user ? [user._id.toString()] : [],
        },
        {
          userId: null,
          title: "Payment Failed",
          message: `Payment attempt by ${registration.firstName} ${registration.lastName} failed. Reference: ${reference}`,
          type: "error",
          recipients: ["admin"],
        },
      ];

      try {
        await PaymentNotification.insertMany(notifications);
        logger.info("Failure notifications created successfully", {
          reference,
        });
      } catch (notificationError) {
        logger.error("Failed to create failure notifications", {
          error: notificationError.message,
          reference,
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const selectedSolution = req.query.selectedSolution || "";
    const solutionType = req.query.solutionType || "";
    const sortBy = req.query.sortBy || "paymentDate"; // Default sort by paymentDate
    const sortOrder = req.query.sortOrder || "desc"; // Default descending
    // Normalize solutionType in query if provided
    let normalizedSolutionType = solutionType;
    if (solutionType === "ConsultingService") {
      normalizedSolutionType = "consulting service";
    } else if (solutionType === "TrainingSchool") {
      normalizedSolutionType = "training school";
    }

    // Build query object with normalized type
    const query = {};
    if (selectedSolution) query.selectedSolution = selectedSolution;
    if (solutionType) query.solutionType = normalizedSolutionType;

    // Build query object
    // const query = {};
    if (selectedSolution) query.selectedSolution = selectedSolution;
    if (solutionType) query.solutionType = solutionType;

    const totalPayments = await Solution.countDocuments(query);

    let payments;
    try {
      payments = await Solution.find(query)
        .populate("solutionId", "title")
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (populateError) {
      console.warn("Population failed, falling back to non-populated query");
      payments = await Solution.find(query)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    res.json({
      success: true,
      data: {
        payments: payments.map((payment) => ({
          ...payment,
          amount: payment.amount,
          paymentDate: payment.paymentDate?.toLocaleDateString(),
          solutionTitle: payment.solutionId?.title || "N/A",
          paymentReference: payment.paymentReference || "N/A",
          paymentMethod: payment.paymentMethod || "N/A",
        })),
        currentPage: page,
        totalPages: Math.ceil(totalPayments / limit),
        totalPayments,
      },
    });
  } catch (error) {
    logger.error(`Get payments error: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

const getPaymentByReference = async (req, res) => {
  try {
    const { reference } = req.params; // Changed from req.query to req.params

    let payment;
    try {
      payment = await Solution.findOne({ paymentReference: reference })
        .populate("solutionId", "title")
        .lean();
    } catch (populateError) {
      console.warn("Population failed, falling back to non-populated query");
      payment = await Solution.findOne({
        paymentReference: reference,
      }).lean();
    }

    if (!payment) {
      logger.warn("Payment not found", { reference });
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...payment,
        amount: payment.amount,
        paymentDate: payment.paymentDate?.toLocaleDateString(),
        solutionTitle: payment.solutionId?.title || "N/A",
        paymentReference: payment.paymentReference || "N/A",
        paymentMethod: payment.paymentMethod || "N/A",
      },
    });
  } catch (error) {
    logger.error(`Get payment error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
      error: error.message,
    });
  }
};
module.exports = {
  initiatePaystackPayment,
  verifyPaystackPayment,
  getAllPayments,
  getPaymentByReference,
};
