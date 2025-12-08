// /routes/appointments.js
import express from "express";
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import Physician from "../models/Physician.js";
import { renderPagination } from "../utils/pagination.js";
import Billing from "../models/Billing.js";

const router = express.Router();
let diagnosisCache = { values: [], fetchedAt: 0 };

router.get("/", async (req, res) => {
  try {
    const guestPatientId = req.session?.guestPatientId;
    const guestObjectId = guestPatientId ? new mongoose.Types.ObjectId(guestPatientId) : null;
    const {
      search = "",
      sort: sortParam = "date",
      order = "desc",
      diagnosis = "",
      page = 1,
      limit = 10,
      ajax = ""
    } = req.query;

    const allowedSorts = ["date", "diagnosis"];
    const sort = allowedSorts.includes(sortParam) ? sortParam : "date";

    const query = { isDeleted: false };
    if (guestObjectId) {
      query.patientID = guestObjectId;
    }

    // SEARCH summary, notes, diagnoses, patient name, physician name
    if (search) {
      const regex = new RegExp(search, "i");
      const patientIds = await Patient.find({ name: regex }).distinct("_id");
      const physicianIds = await Physician.find({ name: regex }).distinct("_id");

      query.$or = [
        { summary: regex },
        { notes: regex },
        { "diagnoses.code": regex },
        { "diagnoses.description": regex },
        ...(patientIds.length ? [{ patientID: { $in: patientIds } }] : []),
        ...(physicianIds.length ? [{ physicianID: { $in: physicianIds } }] : [])
      ];
    }

    // Filter by diagnosis code
    if (diagnosis) {
      query["diagnoses.code"] = diagnosis;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNum - 1) * pageSize;

    // Sorting options
    const dir = order === "asc" ? 1 : -1;

    const totalCount = await Appointment.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);
    const apptsCanEdit = req.session?.physicianRole === "admin";

    // Use aggregate so sorting by patient/physician uses names, not IDs
    const sortField = sort === "diagnosis" ? "diagCode" : "date";

    const appointments = await Appointment.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "patients",
          localField: "patientID",
          foreignField: "_id",
          as: "patient"
        }
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "physicians",
          localField: "physicianID",
          foreignField: "_id",
          as: "physician"
        }
      },
      { $unwind: { path: "$physician", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          patientID: "$patient",
          physicianID: "$physician",
          patientName: "$patient.name",
          physicianName: "$physician.name",
          diagCode: { $ifNull: [{ $arrayElemAt: ["$diagnoses.code", 0] }, ""] }
        }
      },
      {
        $project: {
          patient: 0,
          physician: 0,
          createdAt: 0,
          updatedAt: 0,
          deletedAt: 0,
          deletedBy: 0
        }
      },
      { $sort: { [sortField]: dir, _id: 1 } },
      { $skip: skip },
      { $limit: pageSize }
    ]);

    // AJAX MODE
    if (ajax) {
      return res.render("partials/appointment-row", { appointments, apptsCanEdit }, (err, rowsHtml) => {
        if (err) return res.json({ error: err.message });

        const paginationHtml = renderPagination(req, "/appointments", pageNum, totalPages);

        res.json({
          rowsHtml,
          paginationHtml,
          count: appointments.length,
          totalCount,
        });
      });
    }

    // cache diagnosis options for 5 minutes
    const nowTs = Date.now();
    if (!diagnosisCache.fetchedAt || nowTs - diagnosisCache.fetchedAt > 5 * 60 * 1000) {
      diagnosisCache.values = await Appointment.distinct("diagnoses.code");
      diagnosisCache.fetchedAt = nowTs;
    }

    res.render("appointments", {
      appointments,
      search,
      diagnosis,
      sort,
      order,
      page: pageNum,
      limit: pageSize,
      totalPages,
      totalCount,
      query: req.query,
      user: req.session?.physicianName,
      activePage: "appointments",
      diagnosisOptions: await Appointment.distinct("diagnoses.code"),
      apptsCanEdit,
      req,
      renderPagination,
      diagnosisOptions: diagnosisCache.values,
    });

  } catch (err) {
    console.error("APPOINTMENTS ROUTE ERROR:", err);
    res.status(500).send("Error fetching appointments");
  }
});

function canEditAppointment(req, appointment) {
  if (!req.session?.physicianId) return false;
  if (req.session.physicianRole === "admin") return true;
  if (appointment.physicianID?.toString() === req.session.physicianId.toString()) return true;
  if (appointment.physicianID?.username === "demo_doctor") return true;
  return false;
}

// DETAIL VIEW
router.get("/:id", async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate("patientID")
    .populate("physicianID")
    .lean();

  if (!appointment || appointment.isDeleted) return res.status(404).send("Appointment not found");

  if (req.session?.guestPatientId && appointment.patientID?._id?.toString() !== req.session.guestPatientId.toString()) {
    return res.status(403).send("Guests can only view their own appointments");
  }

  const billings = await Billing.find({ appointmentID: appointment._id, isDeleted: false })
    .populate("patientID", "name contactInfo")
    .lean();

  const apptsCanEdit = canEditAppointment(req, appointment);

  res.render("appointment-detail", {
    appointment,
    billings,
    apptsCanEdit,
    activePage: "appointments",
    user: req.session.physicianName,
  });
});

// EDIT FORM
router.get("/:id/edit", async (req, res) => {
  if (req.session?.guestPatientId) return res.status(403).send("Guests cannot edit appointments");
  const appt = await Appointment.findById(req.params.id).lean();
  if (!appt) return res.status(404).send("Appointment not found");
  if (!canEditAppointment(req, appt)) return res.status(403).send("Unauthorized");

  res.render("appointment-edit", {
    appointment: appt,
    user: req.session.physicianName
  });
});

// UPDATE APPOINTMENT
router.post("/:id/edit", async (req, res) => {
  if (req.session?.guestPatientId) return res.status(403).send("Guests cannot edit appointments");
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).send("Appointment not found");
  if (!canEditAppointment(req, appt)) return res.status(403).send("Unauthorized");

  const { date, summary, notes } = req.body;
  appt.date = date;
  appt.summary = summary;
  appt.notes = notes;
  await appt.save();

  res.redirect("/appointments");
});

// CREATE FORM
router.get("/create", async (req, res) => {
  if (req.session?.guestPatientId) return res.status(403).send("Guests cannot create appointments");
  const patients = await Patient.find({ isDeleted: false }).select("name").lean();
  const physicians = await Physician.find({ isActive: true }).select("name").lean();

  res.render("appointment-form", {
    appointment: null,
    patients,
    physicians,
    user: req.session.physicianName,
  });
});

// CREATE APPOINTMENT
router.post("/", async (req, res) => {
  if (req.session?.guestPatientId) return res.status(403).send("Guests cannot create appointments");
  try {
    const { patientID, physicianID, date, notes, summary, diagnoses } = req.body;

    await Appointment.create({
      patientID,
      physicianID,
      date,
      notes,
      summary,
      diagnoses: diagnoses ? JSON.parse(diagnoses) : [],
    });

    res.redirect("/appointments");

  } catch (err) {
    res.status(400).send("Error creating appointment");
  }
});

// DELETE
router.post("/:id/delete", async (req, res) => {
  if (req.session?.guestPatientId) return res.status(403).send("Guests cannot delete appointments");
  try {
    await Appointment.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.session.physicianId,
    });

    res.redirect("/appointments");

  } catch (err) {
    res.status(500).send("Error deleting appointment");
  }
});

export default router;
