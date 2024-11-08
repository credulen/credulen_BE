// const express = require("express");
// const path = require("path");
// const app = express();
// const bodyParser = require("body-parser");
// const session = require("express-session");
// const cookieParser = require("cookie-parser");
// const morgan = require("morgan");
// const cors = require("cors");
// const multer = require("multer");
// const dotenv = require("dotenv");
// const jwt = require("jsonwebtoken");
// const connectDB = require("./config/db.config");
// const { errorHandlingMiddleware } = require("./middlewares/errorHandling.js");
// const Routes = require("./routes/route.js");
// const UserRoutes = require("./routes/userRoutes.js");
// const PostsRoutes = require("./routes/postRoutes.js");
// const authorRoutes = require("./routes/authorRoutes.js");
// const commentRoutes = require("./routes/commentRoutes.js");
// const speakerRoutes = require("./routes/speakerRoutes.js");
// const eventsRoutes = require("./routes/eventsRoutes.js");
// const solutionRoutes = require("./routes/solutionRoutes.js");

// dotenv.config();
// connectDB();

// app.use(
//   session({
//     secret: process.env.SESSION_SECRET || "your_session_secret",
//     resave: false,
//     saveUninitialized: true,
//     cookie: {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//     },
//   })
// );

// // Middleware
// app.use(express.json());
// app.use(morgan("dev"));
// app.use(cookieParser());
// app.use(bodyParser.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "https://credulen-branch2-opal.vercel.app",
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   })
// );
// app.use(errorHandlingMiddleware);

// const cookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: "strict",
// };

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use("/insertImage", express.static(path.join(__dirname, "insertImage")));

// app.use("/api", Routes);
// app.use("/api", UserRoutes);
// app.use("/api", PostsRoutes);
// app.use("/api", authorRoutes);
// app.use("/api", commentRoutes);
// app.use("/api", speakerRoutes);
// app.use("/api", eventsRoutes);
// app.use("/api", solutionRoutes);

// // Serve static files from the public directory

// app.use(express.static(path.join(__dirname, "public")));

// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "index.html"));
// });

// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db.config");
const { errorHandlingMiddleware } = require("./middlewares/errorHandling.js");
const Routes = require("./routes/route.js");
const UserRoutes = require("./routes/userRoutes.js");
const PostsRoutes = require("./routes/postRoutes.js");
const authorRoutes = require("./routes/authorRoutes.js");
const commentRoutes = require("./routes/commentRoutes.js");
const speakerRoutes = require("./routes/speakerRoutes.js");
const eventsRoutes = require("./routes/eventsRoutes.js");
const solutionRoutes = require("./routes/solutionRoutes.js");

dotenv.config();
connectDB();

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_session_secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  })
);

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://credulen-branch2-opal.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(errorHandlingMiddleware);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/insertImage", express.static(path.join(__dirname, "insertImage")));

app.use("/api", Routes);
app.use("/api", UserRoutes);
app.use("/api", PostsRoutes);
app.use("/api", authorRoutes);
app.use("/api", commentRoutes);
app.use("/api", speakerRoutes);
app.use("/api", eventsRoutes);
app.use("/api", solutionRoutes);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
// Add this middleware before your routes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

// Export the app for Vercel
module.exports = app;
