import express from "express";
import { signup } from "./userauth.controllers.js";

const userAuthRouter = express.Router();

userAuthRouter.post("/signup", signup);

export default userAuthRouter;
