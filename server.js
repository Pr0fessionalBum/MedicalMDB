// server.js
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./utils/db.js";
import { isAuthenticated } from "./middleware/auth.js";

// Route files
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import physicianRoutes from "./routes/physicians.js";
import prescriptionRoutes from "./routes/prescriptions.js";
import appointmentRoutes from "./routes/appointments.js";
import billingRoutes from "./routes/billings.js";
import searchRoutes from "./routes/search.js";
import analyticsRoutes from "./routes/analytics.js";

// Express config
const app = express();
const PORT = 3000;

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(
  session({
    secret: "medical-db-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// ================================
// ROUTES
// ================================

// Authentication routes (login, logout)
app.use("/", authRoutes);

// Protected routes (must be logged in)
app.use("/patients", isAuthenticated, patientRoutes);
app.use("/physicians", isAuthenticated, physicianRoutes);
app.use("/prescriptions", isAuthenticated, prescriptionRoutes);
app.use("/appointments", isAuthenticated, appointmentRoutes);
app.use("/billings", isAuthenticated, billingRoutes);
app.use("/analytics", isAuthenticated, analyticsRoutes);

// Search API
app.use("/api", isAuthenticated, searchRoutes);

// Home redirect
app.get("/", (req, res) => {
  res.render("index", { user: req.session.physicianName || null });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send("404 - Page not found");
});

// Global error logger (catches route crashes, EJS errors, async errors, everything)
app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR:", err);
  res.status(500).send("Internal Server Error");
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => console.log(`✔ Server running on http://localhost:${PORT}`));
});
