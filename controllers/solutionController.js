const Solution = require("../models/solutionModel.js");
const SolutionForm = require("../models/solutionFormModel.js");
const NewsletterSubscription = require("../models/NewsLetterModel.js");
const { errorHandler } = require("../middlewares/errorHandling.js");
const moment = require("moment");
const {
  sendRegSuccessMail1,
  sendRegSuccessMail2,
} = require("../config/regSucessMail.js");

const createSolution = async (req, res, next) => {
  try {
    const { title, content, category } = req.body;

    if (!title || !content) {
      return next(errorHandler(400, "Title, content are required"));
    }

    const existingSolution = await Solution.findOne({ title });
    if (existingSolution) {
      return res
        .status(400)
        .json({ message: "Solution with same title exists" });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const slug = title
      .split(" ")
      .join("-")
      .toLowerCase()
      .replace(/[^a-zA-Z0-9-]/g, "");

    const newSolution = new Solution({
      title,
      content,
      category: category || "Uncategorized",
      slug,
      image: imageUrl,
    });

    const savedSolution = await newSolution.save();
    res.status(201).json(savedSolution);
  } catch (error) {
    console.error("Error in createSolution:", error);
    next(error);
  }
};

// const getAllSolutions = async (req, res, next) => {
//   try {
//     // Get pagination parameters from query with defaults
//     const page = parseInt(req.query.page, 10) || 1;
//     const pageSize = parseInt(req.query.pageSize, 10) || 6; // Changed from 9 to 6
//     const sortDirection = req.query.order === "asc" ? 1 : -1;

//     // Calculate skip value for pagination
//     const skip = (page - 1) * pageSize;

//     // Build query object
//     const query = {
//       ...(req.query.category && { category: req.query.category }),
//       ...(req.query.searchTerm && {
//         $or: [
//           { title: { $regex: req.query.searchTerm, $options: "i" } },
//           { content: { $regex: req.query.searchTerm, $options: "i" } },
//         ],
//       }),
//     };

//     // Execute main query with pagination
//     const solutions = await Solution.find(query)
//       .sort({ updatedAt: sortDirection })
//       .skip(skip)
//       .limit(pageSize);

//     // Get total count for pagination calculations
//     const totalCount = await Solution.countDocuments(query);

//     // Calculate pagination values
//     const totalPages = Math.ceil(totalCount / pageSize);
//     const hasNextPage = page < totalPages;
//     const hasPrevPage = page > 1;

//     // Get last month's solutions count
//     const now = new Date();
//     const oneMonthAgo = new Date(
//       now.getFullYear(),
//       now.getMonth() - 1,
//       now.getDate()
//     );
//     const lastMonthSolutions = await Solution.countDocuments({
//       createdAt: { $gte: oneMonthAgo },
//     });

//     // Send response with pagination metadata
//     res.status(200).json({
//       solutions,
//       pagination: {
//         currentPage: page,
//         pageSize,
//         totalPages,
//         totalCount,
//         hasNextPage,
//         hasPrevPage,
//       },
//       lastMonthSolutions,
//     });
//   } catch (error) {
//     next(error);
//   }
// };
// Backend getAllSolutions controller
const getAllSolutions = async (req, res, next) => {
  try {
    // Get pagination parameters from query with defaults
    const page = Math.max(1, parseInt(req.query.page, 10) || 1); // Ensure page is at least 1
    const pageSize = Math.max(
      1,
      Math.min(50, parseInt(req.query.pageSize, 10) || 6)
    ); // Limit pageSize between 1 and 50
    const sortDirection = req.query.order === "asc" ? 1 : -1;
    const category = req.query.category || null;

    // Calculate skip value for pagination
    const skip = (page - 1) * pageSize;

    // Build query object
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

    // Get total count first
    const totalCount = await Solution.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // Adjust page if it exceeds totalPages
    const adjustedPage = Math.min(page, totalPages);
    const adjustedSkip = (adjustedPage - 1) * pageSize;

    // Execute main query with pagination
    const solutions = await Solution.find(query)
      .sort({ updatedAt: sortDirection })
      .skip(adjustedSkip)
      .limit(pageSize);

    // Calculate pagination values
    const hasNextPage = adjustedPage < totalPages;
    const hasPrevPage = adjustedPage > 1;

    // Get last month's solutions count
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

    // Send response with pagination metadata
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
    const startIndex = parseInt(req.query.startIndex, 10) || 0; // Keep this for pagination

    // Build query object
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

    // Get total count first
    const totalCount = await Solution.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // Execute main query with pagination
    const solutions = await Solution.find(query)
      .sort({ updatedAt: -1 })
      .skip(startIndex) // Use startIndex directly
      .limit(pageSize + 1); // Fetch one extra to check for more

    // Check if there are more items
    const hasMore = solutions.length > pageSize;
    const finalSolutions = solutions.slice(0, pageSize); // Slice to get the exact page size

    // Send response with pagination metadata
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

    // Build the query based on the request parameters
    const query = {
      ...(req.query.category && { category: req.query.category }), // Filter by category if provided
      ...(req.query.searchTerm && {
        $or: [
          { title: { $regex: req.query.searchTerm, $options: "i" } },
          { content: { $regex: req.query.searchTerm, $options: "i" } },
        ],
      }),
      ...(req.query.selectedSolution && {
        selectedSolution: req.query.selectedSolution,
      }), // Filter by selected solution if provided
    };

    // Fetch filtered solutions
    const solutions = await SolutionForm.find(query)
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    // Total number of solutions (filtered by query)
    const totalSolutions = await SolutionForm.countDocuments(query);

    // Weekly count (solutions created in the last 7 days)
    const now = new Date();
    const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
    const lastWeekSolutions = await SolutionForm.countDocuments({
      ...query,
      createdAt: { $gte: oneWeekAgo },
    });

    // Monthly count (solutions created in the last 30 days)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const lastMonthSolutions = await SolutionForm.countDocuments({
      ...query,
      createdAt: { $gte: oneMonthAgo },
    });

    // Send the response with the filtered solutions and counts
    res.status(200).json({
      solutions,
      totalSolutions,
      lastWeekSolutions, // Include weekly count
      lastMonthSolutions, // Include monthly count
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
    const solution = await Solution.findOne({ slug: req.params.slug });

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
    const { title, content, category } = req.body;

    if (!title || !content) {
      return next(errorHandler(400, "Title and content are required"));
    }

    const solution = await Solution.findOne({ slug: slug });
    if (!solution) {
      return next(errorHandler(404, "Solution not found"));
    }

    let imageUrl = solution.image;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const newSlug = title
      .split(" ")
      .join("-")
      .toLowerCase()
      .replace(/[^a-zA-Z0-9-]/g, "");

    solution.title = title;
    solution.content = content;
    solution.category = category || "Uncategorized";
    solution.slug = newSlug;
    solution.image = imageUrl;

    const updatedSolution = await solution.save();
    res.status(200).json(updatedSolution);
  } catch (error) {
    console.error("Error in updateSolution:", error);
    next(error);
  }
};

const deleteSolution = async (req, res, next) => {
  try {
    const { solutionId } = req.params;

    const deletedSolution = await Solution.findByIdAndDelete(solutionId);

    if (!deletedSolution) {
      return res.status(404).json({ message: "Solution not found" });
    }

    res.status(200).json({ message: "Solution deleted successfully" });
  } catch (error) {
    console.error("Error deleting solution:", error.message);
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
      // Duplicate email
      return res.status(409).json({ message: "Email already subscribed." });
    }
    console.error(error);
    res.status(500).json({ message: "An error occurred. Please try again." });
  }
};

const getNewsletterSubscribers = async (req, res) => {
  try {
    const today = new Date();

    // Get start dates for different periods
    const weekStart = moment().subtract(7, "days").toDate();
    const monthStart = moment().subtract(30, "days").toDate();
    const prevMonthStart = moment().subtract(60, "days").toDate();

    // Get total subscribers
    const totalSubscribers = await NewsletterSubscription.countDocuments();

    // Get weekly subscribers
    const weeklySubscribers = await NewsletterSubscription.countDocuments({
      createdAt: { $gte: weekStart },
    });

    // Get current month subscribers
    const monthlySubscribers = await NewsletterSubscription.countDocuments({
      createdAt: { $gte: monthStart },
    });

    // Get previous month subscribers for comparison
    const prevMonthSubscribers = await NewsletterSubscription.countDocuments({
      createdAt: {
        $gte: prevMonthStart,
        $lt: monthStart,
      },
    });

    // Get weekly breakdown
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

    // Get monthly breakdown
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
    } = req.body;

    // Check for existing submission
    const existingSubmission = await SolutionForm.findOne({
      email,
      slug,
    });
    if (existingSubmission) {
      return res.status(400).json({
        message: "You have already submitted a form for this solution.",
      });
    }

    const newSubmission = new SolutionForm({
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
    });

    // Save the submission
    await newSubmission.save();

    // Send confirmation email based on solution type
    try {
      if (solutionType === "ConsultingService") {
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

    // Send success response
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
};
