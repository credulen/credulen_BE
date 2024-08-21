import express from "express";
import connectDB from "./config/db.config.js";
import userAuthRouter from "./modules/authentication/userauth/userauth.routes.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/auth", userAuthRouter);

const PORT = process.env.PORT;

connectDB()
  .then(() => {
    try {
      console.log("connected to mongoose");

      app.listen(PORT, () => {
        console.log(`server is running on http://localhost:${PORT}`);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error) {
      throw new Error(error);
    }
  })
  .catch((error) => {
    throw new Error(error);
  });
