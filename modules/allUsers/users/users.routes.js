import express from "express";
import { Home, Signup } from "./users.controllers.js";

const userRouter = express.Router();

userRouter.get("/", Home);

// userRouter.post("/signup", Signup);

export default userRouter;
