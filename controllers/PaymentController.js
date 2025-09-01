const axios = require("axios");
const logger = require("../config/logger.js");
const SolutionForm = require("../models/solutionFormModel");
const Voucher = require("../models/voucherModel.js");
const Solution = require("../models/solutionModel"); // Import Solution model to fetch amount
const User = require("../models/userModel");
const PaymentNotification = require("../models/PaymentNotificationModel");
const { sendRegSuccessMail1 } = require("../config/regSucessMail.js");
// Store processed payments in the database instead of memory
const ProcessedPayment = require("../models/ProcessedPaymentModel.js");

// New endpoint to preview discounted amount (called when user "applies" code on frontend)
const getDiscountedAmount = async (req, res) => {
  try {
    const { voucherCode, solutionId, email } = req.body;
    if (!solutionId || !email)
      return res
        .status(400)
        .json({ message: "Solution ID and email required" });

    const solution = await Solution.findById(solutionId);
    if (!solution)
      return res.status(404).json({ message: "Solution not found" });

    let discountedAmount = solution.amount;

    if (voucherCode) {
      const validation = await validateVoucher(
        voucherCode,
        email,
        solutionId,
        solution.amount
      );
      if (!validation.valid)
        return res.status(400).json({ message: validation.message });

      const { voucher } = validation;
      if (voucher.discountType === "percentage") {
        discountedAmount *= 1 - voucher.discountValue / 100;
      } else {
        discountedAmount -= voucher.discountValue;
      }
      discountedAmount = Math.max(0, discountedAmount); // Prevent negative
      discountedAmount = Math.round(discountedAmount * 100) / 100; // 2 decimals
    }

    res.status(200).json({ discountedAmount });
  } catch (error) {
    logger.error("Error getting discounted amount:", error);
    res.status(500).json({ message: "Server error" });
  }
};

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

// Helper to validate voucher (from previous response)
const validateVoucher = async (
  voucherCode,
  userEmail,
  solutionId,
  cartAmount
) => {
  try {
    const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() });

    if (!voucher) {
      return { valid: false, message: "Invalid voucher code" };
    }

    // Check expiry
    if (voucher.expiryDate < new Date()) {
      return { valid: false, message: "Voucher has expired" };
    }

    // Check usage limit
    if (voucher.usageLimit > 0 && voucher.usageCount >= voucher.usageLimit) {
      return { valid: false, message: "Voucher usage limit reached" };
    }

    // Check for new users
    if (voucher.forNewUsers) {
      const userExists = await User.exists({ email: userEmail });
      if (userExists) {
        return { valid: false, message: "Voucher only for new users" };
      }
    }

    // Check applicable emails if any
    if (voucher.applicableEmails && voucher.applicableEmails.length > 0) {
      if (!voucher.applicableEmails.includes(userEmail.toLowerCase())) {
        return {
          valid: false,
          message: "Voucher not applicable for your email",
        };
      }
    }

    // Check applicable items if any
    if (voucher.applicableItems && voucher.applicableItems.length > 0) {
      if (!voucher.applicableItems.includes(solutionId)) {
        return {
          valid: false,
          message: "Voucher not applicable for this solution",
        };
      }
    }

    // Check minimum cart amount
    if (cartAmount < voucher.minCartAmount) {
      return {
        valid: false,
        message: `Minimum cart amount of ₦${voucher.minCartAmount} required`,
      };
    }

    // Check if user has already used this voucher (if oncePerUser)
    if (voucher.oncePerUser) {
      const existingUsage = await SolutionForm.findOne({
        email: userEmail,
        voucherCode: voucher.code,
        paymentStatus: "completed",
      });
      if (existingUsage) {
        return { valid: false, message: "You've already used this voucher" };
      }
    }

    return { valid: true, voucher };
  } catch (error) {
    console.error("Voucher validation error:", error);
    return { valid: false, message: "Error validating voucher" };
  }
};

// Initialize Paystack payment
// const initiatePaystackPayment = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       phoneNumber,
//       employmentStatus,
//       jobTitle,
//       selectedSolution,
//       solutionType,
//       solutionId,
//       slug,
//       callback_url,
//       voucherCode,
//     } = req.body;

//     // Validate required fields
//     if (!email || !firstName || !solutionId) {
//       logger.warn("Missing required fields in payment initiation", {
//         body: req.body,
//       });
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields",
//       });
//     }

//     // Fetch the Solution document to get the discounted amount
//     const solution = await Solution.findById(solutionId);
//     if (!solution) {
//       logger.warn("Solution not found for payment initiation", { solutionId });
//       return res.status(404).json({
//         success: false,
//         message: "Solution not found",
//       });
//     }

//     // Apply voucher discount if provided, otherwise use solution.amount
//     let finalAmountInNaira = solution.amount; // Base discounted amount from solution
//     let appliedVoucher = null;
//     if (voucherCode) {
//       const validation = await validateVoucher(
//         voucherCode,
//         email,
//         solutionId,
//         solution.amount
//       );
//       if (!validation.valid) {
//         logger.warn("Voucher validation failed", {
//           voucherCode,
//           message: validation.message,
//         });
//         return res
//           .status(400)
//           .json({ success: false, message: validation.message });
//       }
//       appliedVoucher = validation.voucher;
//       if (appliedVoucher.discountType === "percentage") {
//         finalAmountInNaira *= 1 - appliedVoucher.discountValue / 100;
//       } else {
//         finalAmountInNaira -= appliedVoucher.discountValue;
//       }
//       finalAmountInNaira = Math.max(0, finalAmountInNaira); // Prevent negative
//       finalAmountInNaira = Math.round(finalAmountInNaira * 100) / 100; // 2 decimal places
//     }

//     // Handle free solutions (either from solution.amount or after voucher)
//     if (finalAmountInNaira === 0) {
//       logger.info("Free solution or fully discounted by voucher", {
//         solutionId,
//         voucherCode,
//       });
//       const registration = new SolutionForm({
//         firstName,
//         lastName,
//         email,
//         phoneNumber,
//         employmentStatus,
//         jobTitle,
//         selectedSolution,
//         solutionType:
//           solutionType === "ConsultingService"
//             ? "consulting service"
//             : solutionType === "TrainingSchool"
//             ? "training school"
//             : solutionType,
//         solutionId,
//         slug,
//         amount: solution.amount, // Store original discounted amount
//         finalAmount: 0, // After voucher
//         voucherCode: voucherCode || "",
//         paymentStatus: "completed",
//       });
//       await registration.save();

//       // Increment voucher usage for free solutions
//       if (appliedVoucher) {
//         appliedVoucher.usageCount += 1;
//         await appliedVoucher.save();
//         logger.info("Voucher usage incremented for free solution", {
//           voucherCode,
//         });
//       }

//       // Send confirmation email
//       const emailSent = await sendEmailWithRetry({
//         firstName,
//         lastName,
//         phoneNumber,
//         email,
//         solutionName: selectedSolution,
//         amount: 0,
//         selectedSolution,
//       });

//       if (!emailSent) {
//         logger.error("Failed to send confirmation email for free solution", {
//           email,
//         });
//       }

//       // Create notifications
//       const notifications = [
//         {
//           userId: null,
//           title: "Free Solution Registered",
//           message: `Free registration for ${selectedSolution} by ${firstName} ${lastName}`,
//           type: "info",
//           recipients: ["admin"],
//         },
//       ];
//       try {
//         await PaymentNotification.insertMany(notifications);
//         logger.info("Notifications created for free solution", { email });
//       } catch (notificationError) {
//         logger.error("Failed to create notifications for free solution", {
//           error: notificationError.message,
//         });
//       }

//       return res.status(201).json({
//         success: true,
//         message: "Registered successfully for free solution",
//         data: registration,
//       });
//     }

//     // Convert final amount to kobo for Paystack
//     const finalAmountInKobo = finalAmountInNaira * 100;

//     // Log amounts for clarity
//     logger.info("Payment initiation amounts", {
//       originalAmount: solution.price,
//       solutionDiscountedAmount: solution.amount,
//       finalAmountInNaira,
//       finalAmountInKobo,
//       voucherCode: voucherCode || "none",
//     });

//     // Normalize solutionType
//     let normalizedSolutionType = solutionType;
//     if (solutionType === "ConsultingService") {
//       normalizedSolutionType = "consulting service";
//     } else if (solutionType === "TrainingSchool") {
//       normalizedSolutionType = "training school";
//     }

//     // Create registration record
//     const registration = new SolutionForm({
//       firstName,
//       lastName,
//       email,
//       phoneNumber,
//       employmentStatus,
//       jobTitle,
//       selectedSolution,
//       solutionType: normalizedSolutionType,
//       solutionId,
//       slug,
//       amount: solution.amount, // Original solution discounted amount
//       finalAmount: finalAmountInNaira, // After voucher
//       voucherCode: voucherCode || "",
//       paymentStatus: "pending",
//     });
//     await registration.save();

//     // Initialize Paystack payment
//     const paystackResponse = await axios.post(
//       "https://api.paystack.co/transaction/initialize",
//       {
//         email,
//         amount: finalAmountInKobo, // Use final amount after voucher
//         callback_url: callback_url || process.env.PAYSTACK_CALLBACK_URL, // Fallback to env
//         metadata: {
//           registrationId: registration._id.toString(),
//           fullName: `${firstName} ${lastName}`,
//           solutionId,
//           voucherCode: voucherCode || "",
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const { authorization_url, reference } = paystackResponse.data.data;

//     // Update registration with reference
//     registration.paymentReference = reference;
//     await registration.save();

//     // Find or create user
//     let user = await User.findOne({ email });
//     if (!user) {
//       try {
//         user = new User({
//           firstName,
//           lastName,
//           email,
//           phoneNumber,
//         });
//         await user.save();
//         logger.info("New user created during payment initiation", { email });
//       } catch (userError) {
//         logger.warn("Failed to create user, proceeding with payment", {
//           error: userError.message,
//           email,
//         });
//         user = null;
//       }
//     }

//     // Create notifications
//     const notifications = [
//       {
//         userId: user?._id || null,
//         title: "Payment Initiated",
//         message: `You have initiated a payment of ₦${finalAmountInNaira} for ${selectedSolution}. Payment Reference: ${reference}`,
//         type: "info",
//         recipients: user ? [user._id.toString()] : [],
//       },
//       {
//         userId: null,
//         title: "New Payment Initiated",
//         message: `A payment of ₦${finalAmountInNaira} has been initiated by ${firstName} ${lastName} for ${selectedSolution}. Payment Reference: ${reference}`,
//         type: "info",
//         recipients: ["admin"],
//       },
//     ];

//     try {
//       await PaymentNotification.insertMany(notifications);
//       logger.info(
//         "Notifications created successfully during payment initiation",
//         { reference }
//       );
//     } catch (notificationError) {
//       logger.error("Failed to create notifications during payment initiation", {
//         error: notificationError.message,
//         reference,
//       });
//     }

//     logger.info("Payment initialized successfully", { reference, email });

//     res.json({
//       success: true,
//       authorization_url,
//       reference,
//     });
//   } catch (error) {
//     logger.error(`Payment initiation error: ${error.message}`, {
//       stack: error.stack,
//     });
//     res.status(500).json({
//       success: false,
//       message: "Failed to initialize payment",
//       error: error.message,
//     });
//   }
// };

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
      callback_url,
      voucherCode,
      agentId, // New field from body
      agentCode,
    } = req.body;

    // Validate required fields
    if (!email || !firstName || !solutionId) {
      logger.warn("Missing required fields in payment initiation", {
        body: req.body,
      });
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate and ensure agentID exists or valid
    let referringAgent = null;
    if (agentId) {
      referringAgent = await User.findOne({
        agentId: agentId,
        role: "agent",
      });
      if (!referringAgent) {
        logger.warn("Invalid or non-existent agentId", { agentId });
        return res.status(400).json({
          success: false,
          message: "Invalid agent ID",
        });
      }
      logger.info("Agent validated", {
        agentId,
        agentEmail: referringAgent.email,
      });
    }

    // Fetch the Solution document to get the discounted amount
    const solution = await Solution.findById(solutionId);
    if (!solution) {
      logger.warn("Solution not found for payment initiation", { solutionId });
      return res.status(404).json({
        success: false,
        message: "Solution not found",
      });
    }

    // Apply voucher discount if provided, otherwise use solution.amount
    let finalAmountInNaira = solution.amount;
    let appliedVoucher = null;
    if (voucherCode) {
      const validation = await validateVoucher(
        voucherCode,
        email,
        solutionId,
        solution.amount
      );
      if (!validation.valid) {
        logger.warn("Voucher validation failed", {
          voucherCode,
          message: validation.message,
        });
        return res
          .status(400)
          .json({ success: false, message: validation.message });
      }
      appliedVoucher = validation.voucher;
      if (appliedVoucher.discountType === "percentage") {
        finalAmountInNaira *= 1 - appliedVoucher.discountValue / 100;
      } else {
        finalAmountInNaira -= appliedVoucher.discountValue;
      }
      finalAmountInNaira = Math.max(0, finalAmountInNaira);
      finalAmountInNaira = Math.round(finalAmountInNaira * 100) / 100;
    }

    // Handle free solutions
    if (finalAmountInNaira === 0) {
      logger.info("Free solution or fully discounted by voucher", {
        solutionId,
        voucherCode,
      });
      const registration = new SolutionForm({
        firstName,
        lastName,
        email,
        phoneNumber,
        employmentStatus,
        jobTitle,
        selectedSolution,
        solutionType:
          solutionType === "ConsultingService"
            ? "consulting service"
            : solutionType === "TrainingSchool"
            ? "training school"
            : solutionType,
        solutionId,
        slug,
        amount: solution.amount,
        finalAmount: 0,
        voucherCode: voucherCode || "",
        paymentStatus: "completed",
        agentCode,
      });
      await registration.save();

      // Increment voucher usage for free solutions
      if (appliedVoucher) {
        appliedVoucher.usageCount += 1;
        await appliedVoucher.save();
        logger.info("Voucher usage incremented for free solution", {
          voucherCode,
        });
      }

      // Send confirmation email
      const emailSent = await sendEmailWithRetry({
        firstName,
        lastName,
        phoneNumber,
        email,
        solutionName: selectedSolution,
        amount: 0,
        selectedSolution,
      });

      if (!emailSent) {
        logger.error("Failed to send confirmation email for free solution", {
          email,
        });
      }

      // Create notifications
      const notifications = [
        {
          userId: null,
          title: "Free Solution Registered",
          message: `Free registration for ${selectedSolution} by ${firstName} ${lastName}`,
          type: "info",
          recipients: ["admin"],
        },
      ];
      try {
        await PaymentNotification.insertMany(notifications);
        logger.info("Notifications created for free solution", { email });
      } catch (notificationError) {
        logger.error("Failed to create notifications for free solution", {
          error: notificationError.message,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Registered successfully for free solution",
        data: registration,
      });
    }

    // Convert final amount to kobo for Paystack
    const finalAmountInKobo = finalAmountInNaira * 100;

    // Log amounts for clarity
    logger.info("Payment initiation amounts", {
      originalAmount: solution.price,
      solutionDiscountedAmount: solution.amount,
      finalAmountInNaira,
      finalAmountInKobo,
      voucherCode: voucherCode || "none",
      agentId: agentId || "none",
    });

    // Normalize solutionType
    let normalizedSolutionType = solutionType;
    if (solutionType === "ConsultingService") {
      normalizedSolutionType = "consulting service";
    } else if (solutionType === "TrainingSchool") {
      normalizedSolutionType = "training school";
    }

    // Create registration record
    const registration = new SolutionForm({
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
      amount: solution.amount,
      finalAmount: finalAmountInNaira,
      voucherCode: voucherCode || "",
      paymentStatus: "pending",
      agentCode: agentCode || referringAgent?.agentCode || "",
    });
    await registration.save();

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: finalAmountInKobo,
        callback_url: callback_url || process.env.PAYSTACK_CALLBACK_URL,
        metadata: {
          registrationId: registration._id.toString(),
          fullName: `${firstName} ${lastName}`,
          solutionId,
          voucherCode: voucherCode || "",
          agentCode,
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
    let user = await User.findOne({ email });
    if (!user) {
      try {
        user = new User({
          firstName,
          lastName,
          email,
          phoneNumber,
          referredBy: referringAgent?._id || null, // Link to agent if provided
        });
        await user.save();
        logger.info("New user created during payment initiation", { email });
      } catch (userError) {
        logger.warn("Failed to create user, proceeding with payment", {
          error: userError.message,
          email,
        });
        user = null;
      }
    }

    // Create notifications
    const notifications = [
      {
        userId: user?._id || null,
        title: "Payment Initiated",
        message: `You have initiated a payment of ₦${finalAmountInNaira} for ${selectedSolution}. Payment Reference: ${reference}`,
        type: "info",
        recipients: user ? [user._id.toString()] : [],
      },
      {
        userId: null,
        title: "New Payment Initiated",
        message: `A payment of ₦${finalAmountInNaira} has been initiated by ${firstName} ${lastName} for ${selectedSolution}. Payment Reference: ${reference}`,
        type: "info",
        recipients: ["admin"],
      },
    ];
    if (referringAgent) {
      notifications.push({
        userId: referringAgent._id,
        title: "Payment Initiated via Referral",
        message: `User ${firstName} ${lastName} initiated a payment of ₦${finalAmountInNaira} for ${selectedSolution} via your referral. Reference: ${reference}`,
        type: "info",
        recipients: [referringAgent._id.toString()],
      });
    }

    try {
      await PaymentNotification.insertMany(notifications);
      logger.info(
        "Notifications created successfully during payment initiation",
        { reference }
      );
    } catch (notificationError) {
      logger.error("Failed to create notifications during payment initiation", {
        error: notificationError.message,
        reference,
      });
    }

    logger.info("Payment initialized successfully", {
      reference,
      email,
      agentId: agentId || "none",
    });

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
    return res.status(400).json({
      success: false,
      message: "No reference provided",
    });
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

    const registration = await SolutionForm.findByIdAndUpdate(
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

    // Increment voucher usage if applied
    if (registration.voucherCode) {
      const voucher = await Voucher.findOne({ code: registration.voucherCode });
      if (voucher) {
        voucher.usageCount += 1;
        await voucher.save();
        logger.info("Voucher usage incremented", {
          voucherCode: registration.voucherCode,
        });
      } else {
        logger.warn("Voucher not found during verification", {
          voucherCode: registration.voucherCode,
        });
      }
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
        logger.warn("Failed to create user during payment verification", {
          error: userError.message,
          email: registration.email,
        });
        user = null;
      }
    }

    // Send success email
    const emailSent = await sendEmailWithRetry({
      firstName: registration.firstName,
      lastName: registration.lastName,
      phoneNumber: registration.phoneNumber,
      email: registration.email,
      solutionName: registration.selectedSolution,
      amount: registration.finalAmount || registration.amount, // Use finalAmount if voucher applied
      paymentReference: reference,
      selectedSolution: registration.selectedSolution,
    });

    if (!emailSent) {
      logger.error("Failed to send payment success email after retries", {
        email: registration.email,
      });
    }

    // Create notifications
    const notifications = [
      {
        userId: user?._id || null,
        title: "Payment Successful",
        message: `Your payment of ₦${
          registration.finalAmount || registration.amount
        } for ${registration.selectedSolution} was successful`,
        type: "success",
        recipients: user ? [user._id.toString()] : [],
      },
      {
        userId: null,
        title: "New Payment Received",
        message: `New payment of ₦${
          registration.finalAmount || registration.amount
        } received from ${registration.firstName} ${
          registration.lastName
        } for ${registration.selectedSolution}`,
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
    }

    // Store processed payment
    await ProcessedPayment.create({
      reference,
      processedAt: new Date(),
      expiresAt: new Date(Date.now() + 1800000), // 30 minutes expiry
    });

    logger.info("Payment verification completed successfully", { reference });
    return res.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        amount: registration.finalAmount || registration.amount,
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

    const registration = await SolutionForm.findOne({
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
    const sortBy = req.query.sortBy || "paymentDate";
    const sortOrder = req.query.sortOrder || "desc";

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

    const totalPayments = await SolutionForm.countDocuments(query);

    let payments;
    try {
      payments = await SolutionForm.find(query)
        .populate("solutionId", "title", "metadata")
        .populate({
          path: "agentId",
          select: "_id username email role image", // Select specific fields for referrals
        })
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (populateError) {
      console.warn("Population failed, falling back to non-populated query");
      payments = await SolutionForm.find(query)
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
          metadata: payment.metadata || {}, // Include metadata
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
      payment = await SolutionForm.findOne({ paymentReference: reference })
        .populate("solutionId", "title")
        .lean();
    } catch (populateError) {
      console.warn("Population failed, falling back to non-populated query");
      payment = await SolutionForm.findOne({
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
  getDiscountedAmount,
};
