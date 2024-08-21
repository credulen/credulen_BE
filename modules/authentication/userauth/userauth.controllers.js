import { errorHandler } from "../../../middlewares/errorHandling.js";
import User from "./userauth.model.js";
import bcrypt from "bcrypt";

export const signup = async (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username) {
    next(errorHandler(400, "username is required"));
  } else if (!email) {
    next(errorHandler(400, "email is required"));
  } else if (!password) {
    next(errorHandler(400, "password is required"));
  } else if (!confirmPassword) {
    next(errorHandler(400, "confirmPassword is required"));
  } else if (password !== confirmPassword) {
    next(errorHandler(400, "Password do not match"));
  }

  const hashPassword = bcrypt.hashSync(password, 10);

  const userExists = await User.findOne({ email });
  // console.log("user", userExists);

  try {
    if (userExists) {
      next(
        errorHandler(
          400,
          "You already have an account, please proceed to login"
        )
      );
    } else {
      const savedUser = new User({
        username,
        email,
        password: hashPassword,
      });

      // console.log(savedUser.username, savedUser.email, savedUser.password);

      await savedUser.save();
      res.json({ msg: req.body });
    }
  } catch (error) {
    // throw new Error(error);
    next(error);
  }
};
