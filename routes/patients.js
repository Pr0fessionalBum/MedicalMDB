// /routes/patients.js
import express from "express";
import Patient from "../models/Patient.js";
import Prescription from "../models/Prescription.js";
import Appointment from "../models/Appointment.js";
import Billing from "../models/Billing.js";
import { renderPagination } from "../utils/pagination.js";

const router = express.Router();

router.get("/", async (req, res) => {
  if (req.session?.guestPatientId) {
    return res.redirect(`/patients/${req.session.guestPatientId}`);
  }
  try {
    const {
      search = "",
      sort = "name",
      gender = "",
      ageMin = "",
      ageMax = "",
      page = 1,
      limit = 10,
      ajax = "",
      order = "asc"
    } = req.query;

    const query = { isDeleted: false };

    // SEARCH
    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { "contactInfo.email": new RegExp(search, "i") },
        { "contactInfo.phone": new RegExp(search, "i") }
      ];
    }

    // GENDER FILTER
    if (gender) query.gender = gender;

    // AGE FILTERS
    if (ageMin) query.age = { ...query.age, $gte: parseInt(ageMin) };
    if (ageMax) query.age = { ...query.age, $lte: parseInt(ageMax) };

    // SORT OPTIONS
    const dir = order === "desc" ? -1 : 1;
    const sortOption =
      sort === "dob"
        ? { dob: dir }
        : sort === "age"
        ? { age: dir }
        : sort === "email"
        ? { "contactInfo.email": dir }
        : { name: dir };

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * pageSize;

    const totalCount = await Patient.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    const patients = await Patient.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(pageSize)
      .lean();

    // ============= AJAX RESPONSE =============
    if (ajax) {
      return res.render(
        "partials/patient-row",
        { patients },
        (err, rowsHtml) => {
          if (err) return res.json({ error: err.message });

          const paginationHtml = renderPagination(req, "/patients", pageNum, totalPages);

          return res.json({
            rowsHtml,
            paginationHtml,
            count: patients.length,
            totalCount
          });
        }
      );
    }

    // ============= FULL PAGE RENDER =============
    res.render("patients", {
      patients,
      search,
      sort,
      order,
      gender,
      ageMin,
      ageMax,
      page: pageNum,
      limit: pageSize,
      totalPages,
      totalCount,
      query: req.query,
      user: req.session.physicianName,
      req,                 // REQUIRED for pagination util
      renderPagination,    // <-- REQUIRED for EJS to call it
      activePage: "patients"
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching patients");
  }
});

// CREATE FORM
router.get("/create", (req, res) => {
  if (req.session?.guestPatientId) return res.status(403).send("Guests cannot create patients");
  res.render("patient-form", {
    patient: null,
    user: req.session.physicianName
  });
});

// CREATE PATIENT
router.post("/", async (req, res) => {
  if (req.session?.guestPatientId) return res.status(403).send("Guests cannot create patients");
  try {
    const { name, dob, gender, phone, email, address } = req.body;

    const newPatient = await Patient.create({
      name,
      dob: new Date(dob),
      gender,
      isDeleted: false,
      contactInfo: { phone, email: email?.toLowerCase(), address },
      passwordHash: "password123" // default guest password for testing
    });

    res.redirect(`/patients/${newPatient._id}`);
  } catch (err) {
    console.error(err);
    res.status(400).send("Error creating patient");
  }
});

// EDIT FORM
router.get("/:id/edit", async (req, res) => {
  if (req.session?.guestPatientId) return res.status(403).send("Guests cannot edit patients");
  const patient = await Patient.findById(req.params.id).lean();
  if (!patient) return res.status(404).send("Patient not found");

  res.render("patient-form", {
    patient,
    user: req.session.physicianName
  });
});

// UPDATE PATIENT
router.post("/:id/edit", async (req, res) => {
  if (req.session?.guestPatientId) return res.status(403).send("Guests cannot edit patients");
  try {
    const { name, dob, gender, phone, email, address } = req.body;

    await Patient.findByIdAndUpdate(req.params.id, {
      name,
      dob: new Date(dob),
      gender,
      contactInfo: { phone, email: email?.toLowerCase(), address }
    });

    res.redirect(`/patients/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(400).send("Error updating patient");
  }
});

// VIEW PATIENT DETAIL
router.get("/:id", async (req, res) => {
  try {
    if (req.session?.guestPatientId && req.session.guestPatientId.toString() !== req.params.id) {
      return res.status(403).send("Guests can only view their own profile");
    }
    const patient = await Patient.findById(req.params.id).lean();

    if (!patient) return res.status(404).send("Patient not found");

    // Age calc
    if (patient.dob) {
      const dob = new Date(patient.dob);
      patient.age = Math.floor((Date.now() - dob) / (365.25 * 24 * 3600 * 1000));
    }

    const prescriptions = await Prescription.find({ patientID: patient._id, isDeleted: false })
      .populate("physicianID", "name")
      .sort({ startDate: -1, createdAt: -1 })
      .lean();
    const appointments = await Appointment.find({ patientID: patient._id, isDeleted: false })
      .populate("physicianID", "name")
      .sort({ date: -1 })
      .lean();
    const billings = await Billing.find({ patientID: patient._id, isDeleted: false }).sort({ createdAt: -1 }).lean();

    res.render("patient-detail", {
      patient,
      prescriptions,
      appointments,
      billings,
      user: req.session.physicianName
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading patient details");
  }
});

// DELETE PATIENT
router.post("/:id/delete", async (req, res) => {
  if (req.session?.guestPatientId) return res.status(403).send("Guests cannot delete patients");
  await Patient.findByIdAndUpdate(req.params.id, {
    isDeleted: true,
    deletedAt: new Date()
  });

  res.redirect("/patients");
});


export default router;
