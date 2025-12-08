import express from "express";
import mongoose from "mongoose";
import Physician from "../models/Physician.js";
import Appointment from "../models/Appointment.js";
import Prescription from "../models/Prescription.js";
import Billing from "../models/Billing.js";

import { paginationQuery } from "../utils/query.js";
import { renderPagination } from "../utils/pagination.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const guestPatientId = req.session?.guestPatientId;
    const {
      search = "",
      specialization = "",
      sort = "name",
      order = "asc",
      page = 1,
      limit = 10,
      ajax = ""
    } = req.query;

    const query = { isActive: true };

    if (guestPatientId) {
      const apptPhys = await Appointment.find({ patientID: guestPatientId }).distinct("physicianID");
      const rxPhys = await Prescription.find({ patientID: guestPatientId }).distinct("physicianID");
      const allowedIds = [...new Set([...apptPhys, ...rxPhys].filter(Boolean))];
      if (allowedIds.length === 0) {
        return res.render("physicians", {
          physicians: [],
          search,
          specialization,
          allSpecs: [],
          sort,
          order,
          page: 1,
          limit: parseInt(limit),
          totalCount: 0,
          totalPages: 1,
          paginationQuery,
          renderPagination,
          req,
          user: req.session?.physicianName
        });
      }
      query._id = { $in: allowedIds };
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { specialization: new RegExp(search, "i") },
        { "contactInfo.email": new RegExp(search, "i") },
        { "contactInfo.phone": new RegExp(search, "i") }
      ];
    }

    if (specialization) query.specialization = specialization;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));

    const dir = order === "desc" ? -1 : 1;
    const sortOption =
      sort === "name"
        ? { name: dir }
        : sort === "email"
        ? { "contactInfo.email": dir }
        : { specialization: dir };

    const totalCount = await Physician.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    const physicians = await Physician.find(query)
      .sort(sortOption)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const allSpecs = await Physician.distinct("specialization");

    // AJAX MODE
    if (ajax) {
      const rowsHtml = await Promise.all(
        physicians.map(
          doc =>
            new Promise((resolve, reject) => {
              req.app.render("partials/physician-row", { physician: doc }, (err, html) => {
                if (err) reject(err);
                else resolve(html);
              });
            })
        )
      );

      const paginationHtml = renderPagination(req, "/physicians", pageNum, totalPages);

      return res.json({
        rowsHtml: rowsHtml.join(""),
        paginationHtml,
        count: physicians.length,
        totalCount
      });
    }

    res.render("physicians", {
      physicians,
      search,
      specialization,
      allSpecs,
      sort,
      order,
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages,
      paginationQuery,
      renderPagination,
      req, // REQUIRED for ejs pagination
      user: req.session?.physicianName,
      activePage: "physicians"
    });

  } catch (err) {
    console.error("PHYSICIANS ROUTE ERROR:", err);
    res.status(500).send("Error fetching physicians");
  }
});

async function loadPhysicianContext(id) {
  const physician = await Physician.findById(id).lean();
  if (!physician) return null;

  const appointments = await Appointment.find({ physicianID: id })
    .sort({ date: -1 })
    .limit(20)
    .lean();

  const prescriptions = await Prescription.find({ physicianID: id })
    .sort({ startDate: -1 })
    .limit(20)
    .populate("patientID", "name")
    .lean();

  const apptIds = appointments.map(a => a._id);
  const billings = apptIds.length
    ? await Billing.find({ appointmentID: { $in: apptIds } })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("patientID", "name")
        .lean()
    : [];

  return { physician, appointments, prescriptions, billings };
}

function canEditPhysician(req, physician) {
  if (!req.session?.physicianId) return false;
  if (req.session.physicianRole === "admin") return true;
  if (req.session.physicianId.toString() === physician._id.toString()) return true;
  if (physician.username === "demo_doctor") return true;
  return false;
}

// PHYSICIAN PROFILE (by id)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("Physician not found");
  }

  if (req.session?.guestPatientId) {
    const allowed = await Appointment.exists({ patientID: req.session.guestPatientId, physicianID: id }) ||
      await Prescription.exists({ patientID: req.session.guestPatientId, physicianID: id });
    if (!allowed) return res.status(403).send("Guests can only view their physicians");
  }

  const ctx = await loadPhysicianContext(id);
  if (!ctx) return res.status(404).send("Physician not found");

  res.render("physician-detail", {
    ...ctx,
    canEdit: canEditPhysician(req, ctx.physician),
    activePage: "physicians",
    user: req.session?.physicianName
  });
});

// EDIT FORM
router.get("/:id/edit", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send("Physician not found");

  const physician = await Physician.findById(id).lean();
  if (!physician) return res.status(404).send("Physician not found");
  if (!canEditPhysician(req, physician)) return res.status(403).send("Unauthorized");

  res.render("physician-edit", {
    physician,
    activePage: "physicians",
    user: req.session?.physicianName
  });
});

// UPDATE
router.post("/:id/edit", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send("Physician not found");

  const physician = await Physician.findById(id);
  if (!physician) return res.status(404).send("Physician not found");
  if (!canEditPhysician(req, physician)) return res.status(403).send("Unauthorized");

  const { name, specialization, username, email, phone, schedule } = req.body;
  physician.name = name;
  physician.specialization = specialization;
  physician.username = username;
  physician.contactInfo = { email, phone };
  physician.schedule = (schedule || "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  await physician.save();
  res.redirect(`/physicians/${physician._id}`);
});

export default router;
