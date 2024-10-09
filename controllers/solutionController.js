const Solution = require("../models/solutionModel.js");
const SolutionForm = require("../models/solutionFormModel.js");
const { errorHandler } = require("../middlewares/errorHandling.js");

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

const getAllSolutions = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 9;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const query = {
      ...(req.query.category && { category: req.query.category }),
      ...(req.query.searchTerm && {
        $or: [
          { title: { $regex: req.query.searchTerm, $options: "i" } },
          { content: { $regex: req.query.searchTerm, $options: "i" } },
        ],
      }),
    };

    const solutions = await Solution.find(query)
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    const totalSolutions = await Solution.countDocuments(query);

    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const lastMonthSolutions = await Solution.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      solutions,
      totalSolutions,
      lastMonthSolutions,
    });
  } catch (error) {
    next(error);
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

module.exports = {
  createSolution,
  getAllSolutions,
  getSolutionBySlug,
  updateSolution,
  deleteSolution,
  submitSolutionForm,
};
