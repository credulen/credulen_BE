import User from "./userauth.model.js";
import bcrypt from "bcrypt";

export const signup = async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username) {
    console.log(username);
    return res
      .status(400)
      .json({ status: "fail", msg: "username is required" });
  } else if (!email) {
    console.log(email);
    return res.status(400).json({ status: "fail", msg: "email is required" });
  } else if (!password) {
    console.log(password);
    return res
      .status(400)
      .json({ status: "fail", msg: "password is required" });
  } else if (!confirmPassword) {
    console.log(confirmPassword);
    return res
      .status(400)
      .json({ status: "fail", msg: "confirm password is required" });
  } else if (password !== confirmPassword) {
    console.log(confirmPassword);
    return res
      .status(400)
      .json({ status: "fail", msg: "Password do not match" });
  }

  const hashPassword = bcrypt.hashSync(password, 10);

  const userExists = await User.findOne({ email });
  // console.log("user", userExists);

  try {
    if (userExists) {
      return res.status(400).json({
        status: "fail",
        msg: "You already have an account, please proceed to login",
      });
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
    throw new Error(error);
  }
};
