import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  const DATABASE_URI = process.env.DATABASE_URI;

  try {
    await mongoose.connect(DATABASE_URI);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error) {
    throw new Error(error);
  }
};

export default connectDB;
