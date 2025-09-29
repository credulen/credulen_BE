const Solution = require("../models/solutionModel.js");
const SolutionForm = require("../models/solutionFormModel.js");
const ConsultingServiceForm = require("../models/consultingServiceBookingModel.js");
const NewsletterSubscription = require("../models/NewsLetterModel.js");
const Voucher = require("../models/voucherModel.js");
const { errorHandler } = require("../middlewares/errorHandling.js");
const moment = require("moment");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;

const {
  sendRegSuccessMail1,
  sendRegSuccessMail2,
} = require("../config/regSucessMail.js");

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file, folder = "Credulen/solutions") => {
  try {
    if (!file?.tempFilePath) {
      throw new Error("No temp file path found");
    }

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: folder,
      resource_type: "auto",
    });

    // Clean up temp file
    await fs.unlink(file.tempFilePath);
    return result.secure_url;
  } catch (error) {
    console.error("Upload to Cloudinary failed:", error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (url) => {
  try {
    if (!url) return;

    // Parse the Cloudinary URL
    const urlParts = url.split("/");
    const versionIndex = urlParts.findIndex((part) => part.startsWith("v"));

    if (versionIndex === -1) {
      console.error(`Invalid Cloudinary URL format: ${url}`);
      return;
    }

    const publicId = urlParts
      .slice(versionIndex + 1)
      .join("/")
      .replace(/\.[^/.]+$/, "");

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
    } else {
      console.error(`Deletion failed for: ${publicId}`, result);
    }
  } catch (error) {
    console.error(`Failed to delete from Cloudinary:`, error);
  }
};

const createSolution = async (req, res, next) => {
  try {
    console.log("createSolution: Request body:", req.body);
    console.log("createSolution: Files:", req.files);

    const {
      title,
      content,
      category,
      trainingDesc,
      price,
      GBPrate,
      discountPercentage,
      isAllLevels,
      isExpertLed,
      duration,
      isOnline,
      prerequisites,
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      console.log("createSolution: Missing title or content", {
        title,
        content,
      });
      return next(errorHandler(400, "Title and content are required"));
    }

    // Validate price
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return next(errorHandler(400, "Price must be a non-negative number"));
    }

    // Validate discountPercentage
    const parsedDiscount = parseFloat(discountPercentage);
    if (
      discountPercentage &&
      (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100)
    ) {
      return next(
        errorHandler(400, "Discount percentage must be between 0 and 100")
      );
    }

    // Check for existing solution
    const existingSolution = await Solution.findOne({ title });
    if (existingSolution) {
      console.log("createSolution: Solution with title exists:", title);
      return next(errorHandler(400, "Solution with same title exists"));
    }

    // Handle image upload to Cloudinary
    let imageUrl = null;
    if (req.files && req.files.image) {
      try {
        imageUrl = await uploadToCloudinary(req.files.image);
        console.log("createSolution: Image uploaded:", imageUrl);
      } catch (uploadError) {
        console.error("createSolution: Image upload failed:", uploadError);
        return next(
          errorHandler(500, `Image upload failed: ${uploadError.message}`)
        );
      }
    }

    // Generate slug
    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Prepare solution data
    const solutionData = {
      title: title.trim(),
      content: content.trim(),
      category: category?.trim() || "Uncategorized",
      slug,
      image: imageUrl,
      trainingDesc: trainingDesc?.trim() || "",
      price: parsedPrice,
      GBPrate: GBPrate || 0,
      discountPercentage: parsedDiscount || 0,
      isAllLevels: isAllLevels || "Designed for All Levels",
      isExpertLed: isExpertLed || "Expert-Led Content",
      duration: duration || "3 Weeks Duration",
      isOnline: isOnline || "100% Online Learning",
      prerequisites:
        prerequisites || "Basic knowledge of programming recommended",
    };
    console.log("createSolution: Data to save:", solutionData);

    const newSolution = new Solution(solutionData);
    const savedSolution = await newSolution.save();
    console.log("createSolution: Solution saved:", savedSolution);

    res.status(201).json({
      success: true,
      solution: savedSolution,
      message: "Solution created successfully",
    });
  } catch (error) {
    console.error("createSolution: Error:", error);
    next(error);
  }
};

const getAllSolutions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.max(
      1,
      Math.min(50, parseInt(req.query.pageSize, 10) || 6)
    );
    const sortDirection = req.query.order === "asc" ? 1 : -1;
    const category = req.query.category || null;

    const skip = (page - 1) * pageSize;

    const query = {};
    if (category) {
      query.category = category;
    }

    if (req.query.searchTerm) {
      query.$or = [
        { title: { $regex: req.query.searchTerm, $options: "i" } },
        { content: { $regex: req.query.searchTerm, $options: "i" } },
      ];
    }

    const totalCount = await Solution.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const adjustedPage = Math.min(page, totalPages);
    const adjustedSkip = (adjustedPage - 1) * pageSize;

    const solutions = await Solution.find(query)
      .select(
        "title content category slug image trainingDesc price amount discountPercentage isAllLevels isExpertLed duration isOnline prerequisites"
      )
      .sort({ updatedAt: sortDirection })
      .skip(adjustedSkip)
      .limit(pageSize);

    const hasNextPage = adjustedPage < totalPages;
    const hasPrevPage = adjustedPage > 1;

    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    const lastMonthSolutions = await Solution.countDocuments({
      createdAt: { $gte: oneMonthAgo },
      ...(category && { category }),
    });

    res.status(200).json({
      solutions,
      pagination: {
        currentPage: adjustedPage,
        pageSize,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
      },
      lastMonthSolutions,
    });
  } catch (error) {
    next(error);
  }
};

const getAllSolutionLists = async (req, res, next) => {
  try {
    const pageSize = Math.max(
      1,
      Math.min(50, parseInt(req.query.pageSize, 10) || 6)
    );
    const category = req.query.category || null;
    const startIndex = parseInt(req.query.startIndex, 10) || 0;

    const query = {};
    if (category) {
      query.category = category;
    }
    if (req.query.searchTerm) {
      query.$or = [
        { title: { $regex: req.query.searchTerm, $options: "i" } },
        { content: { $regex: req.query.searchTerm, $options: "i" } },
      ];
    }

    const totalCount = await Solution.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const solutions = await Solution.find(query)
      .sort({ updatedAt: -1 })
      .skip(startIndex)
      .limit(pageSize + 1);

    const hasMore = solutions.length > pageSize;
    const finalSolutions = solutions.slice(0, pageSize);

    res.status(200).json({
      solutions: finalSolutions,
      pagination: {
        totalCount,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSolutionForms = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 20;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const query = {
      ...(req.query.category && { category: req.query.category }),
      ...(req.query.searchTerm && {
        $or: [
          { title: { $regex: req.query.searchTerm, $options: "i" } },
          { content: { $regex: req.query.searchTerm, $options: "i" } },
        ],
      }),
      ...(req.query.selectedSolution && {
        selectedSolution: req.query.selectedSolution,
      }),
    };

    const solutions = await SolutionForm.find(query)
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    const totalSolutions = await SolutionForm.countDocuments(query);

    const now = new Date();
    const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
    const lastWeekSolutions = await SolutionForm.countDocuments({
      ...query,
      createdAt: { $gte: oneWeekAgo },
    });

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const lastMonthSolutions = await SolutionForm.countDocuments({
      ...query,
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      solutions,
      totalSolutions,
      lastWeekSolutions,
      lastMonthSolutions,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSolutionsByType = async (req, res, next) => {
  try {
    const { selectedSolution } = req.body;

    if (!selectedSolution) {
      return res.status(400).json({ message: "Selected solution is required" });
    }

    const result = await SolutionForm.deleteMany({ selectedSolution });

    if (result.deletedCount > 0) {
      res.status(200).json({
        message: `Deleted ${result.deletedCount} solutions of type ${selectedSolution}`,
      });
    } else {
      res
        .status(404)
        .json({ message: `No solutions found for type ${selectedSolution}` });
    }
  } catch (error) {
    console.error("Error deleting solutions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSolutionBySlug = async (req, res, next) => {
  try {
    const solution = await Solution.findOne({ slug: req.params.slug }).select(
      "title content category slug image trainingDesc price amount discountPercentage isAllLevels isExpertLed duration isOnline prerequisites GBPrate"
    );

    if (!solution) {
      return next(errorHandler(404, "Solution not found"));
    }
    res.status(200).json(solution);
  } catch (error) {
    next(error);
  }
};

const updateSolution = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const {
      title,
      content,
      category,
      trainingDesc,
      price,
      GBPrate,
      discountPercentage,
      isAllLevels,
      isExpertLed,
      duration,
      isOnline,
      prerequisites,
    } = req.body;

    if (!title || !content) {
      return next(errorHandler(400, "Title and content are required"));
    }

    const solution = await Solution.findOne({ slug });
    if (!solution) {
      return next(errorHandler(404, "Solution not found"));
    }

    // Validate price if provided
    const parsedPrice = price ? parseFloat(price) : solution.price;
    if (price && (isNaN(parsedPrice) || parsedPrice < 0)) {
      return next(errorHandler(400, "Price must be a non-negative number"));
    }

    // Validate discountPercentage if provided
    const parsedDiscount = discountPercentage
      ? parseFloat(discountPercentage)
      : solution.discountPercentage;
    if (
      discountPercentage &&
      (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100)
    ) {
      return next(
        errorHandler(400, "Discount percentage must be between 0 and 100")
      );
    }

    let imageUrl = solution.image;
    if (req.files && req.files.image) {
      try {
        if (solution.image) {
          await deleteFromCloudinary(solution.image);
        }
        imageUrl = await uploadToCloudinary(req.files.image);
      } catch (uploadError) {
        return next(
          errorHandler(500, `Image upload failed: ${uploadError.message}`)
        );
      }
    }

    const newSlug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Update the solution instance and save to trigger pre-save middleware
    solution.title = title.trim();
    solution.content = content.trim();
    solution.category = category?.trim() || solution.category;
    solution.slug = newSlug;
    solution.image = imageUrl;
    solution.trainingDesc = trainingDesc?.trim() || solution.trainingDesc || "";
    solution.price = parsedPrice;
    solution.GBPrate = GBPrate || solution.GBPrate;
    solution.discountPercentage = parsedDiscount;
    solution.isAllLevels = isAllLevels || solution.isAllLevels;
    solution.isExpertLed = isExpertLed || solution.isExpertLed;
    solution.duration = duration || solution.duration;
    solution.isOnline = isOnline || solution.isOnline;
    solution.prerequisites = prerequisites || solution.prerequisites;

    const updatedSolution = await solution.save();

    res.status(200).json({
      success: true,
      solution: updatedSolution,
      message: "Solution updated successfully",
    });
  } catch (error) {
    console.error("Error in updateSolution:", error);
    next(error);
  }
};
const deleteSolution = async (req, res, next) => {
  try {
    const { solutionId } = req.params;
    const solution = await Solution.findById(solutionId);

    if (!solution) {
      return next(errorHandler(404, "Solution not found"));
    }

    if (solution.image) {
      await deleteFromCloudinary(solution.image);
    }

    await Solution.findByIdAndDelete(solutionId);
    res.status(200).json({
      success: true,
      message: "Solution deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting solution:", error);
    next(error);
  }
};

const submitSolutionForm = async (req, res) => {
  try {
    const newForm = new SolutionForm(req.body);
    await newForm.save();
    res
      .status(201)
      .json({ message: "Form submitted successfully", form: newForm });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error submitting form", error: error.message });
  }
};

const NewLetterSubscribe = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const subscription = new NewsletterSubscription({ email });
    await subscription.save();
    res.status(201).json({ message: "Subscription successful!" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already subscribed." });
    }
    console.error(error);
    res.status(500).json({ message: "An error occurred. Please try again." });
  }
};

const getNewsletterSubscribers = async (req, res) => {
  try {
    const today = new Date();

    const weekStart = moment().subtract(7, "days").toDate();
    const monthStart = moment().subtract(30, "days").toDate();
    const prevMonthStart = moment().subtract(60, "days").toDate();

    const totalSubscribers = await NewsletterSubscription.countDocuments();

    const weeklySubscribers = await NewsletterSubscription.countDocuments({
      createdAt: { $gte: weekStart },
    });

    const monthlySubscribers = await NewsletterSubscription.countDocuments({
      createdAt: { $gte: monthStart },
    });

    const prevMonthSubscribers = await NewsletterSubscription.countDocuments({
      createdAt: {
        $gte: prevMonthStart,
        $lt: monthStart,
      },
    });

    const weeklyBreakdown = await NewsletterSubscription.aggregate([
      {
        $match: {
          createdAt: { $gte: weekStart },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const monthlyBreakdown = await NewsletterSubscription.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSubscribers,
        weeklySubscribers,
        monthlySubscribers,
        prevMonthSubscribers,
        weeklyBreakdown,
        monthlyBreakdown,
        growthRate: {
          monthly: (
            ((monthlySubscribers - prevMonthSubscribers) /
              prevMonthSubscribers) *
            100
          ).toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching newsletter subscribers:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscriber data",
      error: error.message,
    });
  }
};

const registerForSolution = async (req, res, next) => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      employmentStatus,
      jobTitle,
      selectedSolution,
      slug,
      solutionCategory,
      companyName,
      companyIndustry,
      companySize,
      country,
      firstName,
      lastName,
      solutionType,
      preferredDate, // New field
      preferredTime, // New field
      message, // New field
    } = req.body;

    const existingSubmission = await ConsultingServiceForm.findOne({
      email,
      slug,
    });
    if (existingSubmission) {
      return res.status(400).json({
        message: "You have already submitted a form for this solution.",
      });
    }

    const newSubmission = new ConsultingServiceForm({
      fullName,
      phoneNumber,
      email,
      employmentStatus,
      jobTitle,
      selectedSolution,
      slug,
      solutionCategory,
      companyName,
      companyIndustry,
      companySize,
      country,
      firstName,
      lastName,
      solutionType,
      preferredDate, // New field
      preferredTime, // New field
      message, // New field
    });

    await newSubmission.save();

    try {
      if (solutionType === "consulting service") {
        await sendRegSuccessMail2({
          fullName,
          phoneNumber,
          email,
          employmentStatus,
          jobTitle,
          selectedSolution,
          slug,
          solutionCategory,
          companyName,
          companyIndustry,
          companySize,
          country,
          firstName,
          lastName,
          solutionType,
          preferredDate,
          preferredTime,
          message,
        });
      } else {
        await sendRegSuccessMail1({
          firstName,
          lastName,
          phoneNumber,
          email,
          employmentStatus,
          jobTitle,
          selectedSolution,
        });
      }
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    return res.status(201).json({
      message: "Form submitted successfully",
      data: newSubmission,
    });
  } catch (error) {
    console.error("Error submitting solution form:", error);
    return res.status(500).json({
      message: "An error occurred while submitting the form",
      error: error.message,
    });
  }
};

const getConsultingServiceForms = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 20;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const query = {
      ...(req.query.category && { category: req.query.category }),
      ...(req.query.searchTerm && {
        $or: [
          { title: { $regex: req.query.searchTerm, $options: "i" } },
          { content: { $regex: req.query.searchTerm, $options: "i" } },
        ],
      }),
      ...(req.query.selectedSolution && {
        selectedSolution: req.query.selectedSolution,
      }),
    };

    const solutions = await ConsultingServiceForm.find(query)
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    const totalSolutions = await ConsultingServiceForm.countDocuments(query);

    const now = new Date();
    const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
    const lastWeekSolutions = await ConsultingServiceForm.countDocuments({
      ...query,
      createdAt: { $gte: oneWeekAgo },
    });

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const lastMonthSolutions = await ConsultingServiceForm.countDocuments({
      ...query,
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      solutions,
      totalSolutions,
      lastWeekSolutions,
      lastMonthSolutions,
    });
  } catch (error) {
    next(error);
  }
};

const deleteConsultingServiceForm = async (req, res, next) => {
  try {
    const { id } = req.params;

    const form = await ConsultingServiceForm.findByIdAndDelete(id);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    res.status(200).json({ message: "Form deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Solution Vouchers

// Create Voucher
// Create Voucher
const createVoucher = async (req, res, next) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      expiryDate,
      usageLimit,
      oncePerUser,
      applicableItems,
      applicableEmails,
      minCartAmount,
      forNewUsers,
    } = req.body;

    // Validate required fields
    if (!code || !discountType || !discountValue || !expiryDate) {
      return next(errorHandler(400, "Required fields are missing"));
    }

    const newVoucher = new Voucher({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      expiryDate,
      usageLimit,
      oncePerUser,
      applicableItems: applicableItems || [],
      applicableEmails: (applicableEmails || []).map((email) =>
        email.toLowerCase().trim()
      ),
      minCartAmount,
      forNewUsers,
    });

    await newVoucher.save();
    res.status(201).json(newVoucher);
  } catch (error) {
    next(error);
  }
};

// Update Voucher
const updateVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) {
      return next(errorHandler(404, "Voucher not found"));
    }

    const updatedData = {
      ...req.body,
      code: req.body.code ? req.body.code.toUpperCase() : voucher.code,
      applicableItems: req.body.applicableItems || voucher.applicableItems,
      applicableEmails: req.body.applicableEmails
        ? req.body.applicableEmails.map((email) => email.toLowerCase().trim())
        : voucher.applicableEmails,
    };

    const updatedVoucher = await Voucher.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );
    res.status(200).json(updatedVoucher);
  } catch (error) {
    next(error);
  }
};

// Get All Vouchers (with pagination similar to getAllSolutions)
const getAllVouchers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.searchTerm) {
      query.code = { $regex: req.query.searchTerm, $options: "i" };
    }

    const vouchers = await Voucher.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("applicableItems", "title");

    const totalVouchers = await Voucher.countDocuments(query);

    res.status(200).json({
      vouchers,
      totalVouchers,
      currentPage: page,
    });
  } catch (error) {
    next(error);
  }
};

// Get Voucher by ID
const getVoucherByCode = async (req, res, next) => {
  try {
    const voucher = await Voucher.findOne({ code: req.body.code }).populate(
      "applicableItems",
      "title"
    );
    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    res.status(200).json(voucher);
  } catch (error) {
    next(error);
  }
};
// Get Voucher by ID
const getVoucherById = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log("Searching for voucher with id:", id); // Debug log
    const voucher = await Voucher.findById(id).populate(
      "applicableItems",
      "title"
    );

    if (!voucher) {
      console.log("Voucher not found for id:", id); // Debug log
      return res.status(404).json({ message: "Voucher not found" });
    }
    res.status(200).json(voucher);
  } catch (error) {
    console.error("Error in getVoucherById:", error);
    next(error); // Pass to error middleware
  }
};

// Delete Voucher
const deleteVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!voucher) {
      return next(errorHandler(404, "Voucher not found"));
    }
    res.status(200).json({ message: "Voucher deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSolution,
  getAllSolutions,
  getAllSolutionLists,
  getSolutionBySlug,
  updateSolution,
  deleteSolution,
  submitSolutionForm,
  getSolutionForms,
  deleteSolutionsByType,
  NewLetterSubscribe,
  getNewsletterSubscribers,
  registerForSolution,
  getConsultingServiceForms,
  deleteConsultingServiceForm,
  // Vouchers
  createVoucher,
  getAllVouchers,
  getVoucherById,
  getVoucherByCode,
  updateVoucher,
  deleteVoucher,
};
