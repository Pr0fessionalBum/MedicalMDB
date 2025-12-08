// /routes/auth.js
import express from "express";
import Physician from "../models/Physician.js";
import { isAuthenticated } from "../middleware/auth.js";
import Patient from "../models/Patient.js";

const router = express.Router();

// Login page
router.get("/login", async (req, res) => {
  const demoUsers = await Physician.find({ username: { $in: ["demo_doctor", "demo_admin"] } })
    .select("username role")
    .lean();
  res.render("login", { error: null, demoUsers });
});

// Login POST
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const normalizedUsername = (username || "").trim();
    const demoUsers = await Physician.find({ username: { $in: ["demo_doctor", "demo_admin"] } })
      .select("username role")
      .lean();

    // Try physician login first
    const physician = await Physician.findOne({ username: normalizedUsername });

    if (!physician) {
      // Try patient guest login using email as username
      const patient = await Patient.findOne({ "contactInfo.email": normalizedUsername.toLowerCase() });
      if (!patient) {
        return res.render("login", { error: "Invalid username or password", demoUsers });
      }

      const patientValid = await patient.verifyPassword(password);
      if (!patientValid) {
        return res.render("login", { error: "Invalid username or password", demoUsers });
      }

      req.session.guestPatientId = patient._id;
      delete req.session.physicianId;
    req.session.physicianRole = "guest";
    req.session.physicianName = patient.name;

      return res.redirect(`/patients/${patient._id}`);
    }

    const isValid = await physician.verifyPassword(password);
    if (!isValid) {
      return res.render("login", { error: "Invalid username or password", demoUsers });
    }

    req.session.physicianId = physician._id;
    req.session.physicianName = physician.name;
    req.session.physicianRole = physician.role || "physician";

    res.redirect("/patients");
  } catch (err) {
    const demoUsers = await Physician.find({ username: { $in: ["demo_doctor", "demo_admin"] } })
      .select("username role")
      .lean();
    res.render("login", { error: "Login failed: " + err.message, demoUsers });
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Physician self-profile
router.get("/account", isAuthenticated, async (req, res) => {
  const physician = await Physician.findById(req.session.physicianId).lean();
  if (!physician) return res.redirect("/login");

  res.redirect(`/physicians/${physician._id}`);
});

export default router;
