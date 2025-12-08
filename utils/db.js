// /utils/db.js
import mongoose from "mongoose";

export async function connectDB() {
  const MONGO_URI = "mongodb://127.0.0.1:27017/medicalApp";

  try {
    await mongoose.connect(MONGO_URI, { dbName: "medicalApp" });
    console.log("✔ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}
