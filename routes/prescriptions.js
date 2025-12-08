import express from "express";
import mongoose from "mongoose";
import Prescription from "../models/Prescription.js";
import Patient from "../models/Patient.js";
import Physician from "../models/Physician.js";

import { paginationQuery } from "../utils/query.js";
import { renderPagination } from "../utils/pagination.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const guestPatientId = req.session?.guestPatientId;
    const guestObjectId = guestPatientId ? new mongoose.Types.ObjectId(guestPatientId) : null;
    const {
      search = "",
      status = "",
      type = "",
      sort = "medicationName",
      order = "asc",
      page = 1,
      limit = 10,
      ajax = ""
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));

    // BUILD QUERY
    const query = { isDeleted: false };
    if (guestObjectId) {
      query.patientID = guestObjectId;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      const patientIds = await Patient.find({ name: regex }).distinct("_id");
      const physicianIds = await Physician.find({ name: regex }).distinct("_id");

      query.$or = [
        { medicationName: regex },
        { medicationCode: regex },
        { dosage: regex },
        { instructions: regex },
        ...(patientIds.length ? [{ patientID: { $in: patientIds } }] : []),
        ...(physicianIds.length ? [{ physicianID: { $in: physicianIds } }] : [])
      ];
    }

    // Accept valid statuses present in model
    const validStatuses = ["active", "completed"];
    if (status && validStatuses.includes(status)) {
      query.status = status;
    }

    if (type) query.type = type;

    // SORTING with order toggle
    const sortDir = order === "desc" ? -1 : 1;
    const sortFieldMap = {
      medicationName: "medicationName",
      status: "status",
      startDate: "startDate",
      endDate: "endDate",
      patient: "patientName",
      type: "typeField",
      frequency: "frequencyField",
      dosage: "dosageField"
    };
    const sortField = sortFieldMap[sort] || "medicationName";

    const totalCount = await Prescription.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    const prescriptions = await Prescription.aggregate([
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
          typeField: { $ifNull: ["$type", ""] },
          frequencyField: { $ifNull: ["$frequency", ""] },
          dosageField: { $ifNull: ["$dosage", ""] }
        }
      },
      {
        $project: {
          patient: 0,
          physician: 0,
          notes: 0,
          instructions: 0,
          createdAt: 0,
          updatedAt: 0,
          deletedAt: 0,
          deletedBy: 0
        }
      },
      { $sort: { [sortField]: sortDir, _id: 1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum }
    ]);

    // ---------- AJAX MODE ----------
    if (ajax) {
      const rowsHtmlArray = prescriptions.map(
        (rx) =>
          new Promise((resolve, reject) => {
            res.render(
              "partials/prescription-row",
              { rx },
              (err, html) => (err ? reject(err) : resolve(html))
            );
          })
      );

      const rowsHtml = (await Promise.all(rowsHtmlArray)).join("");

      return res.json({
        rowsHtml,
        paginationHtml: renderPagination(req, "/prescriptions", pageNum, totalPages),
        count: prescriptions.length,
        totalCount
      });
    }

    // ---------- FULL PAGE ----------
    res.render("prescriptions", {
      prescriptions,
      search,
      status,
      type,
      sort,
      order,
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages,
      paginationQuery,
      renderPagination,
      user: req.session?.physicianName,
      activePage: "prescriptions",
      req
    });
  } catch (err) {
    console.error("PRESCRIPTIONS ROUTE ERROR:", err);
    res.status(500).send("Error fetching prescriptions");
  }
});

function canEditPrescription(req, rx) {
  if (!req.session?.physicianId) return false;
  if (req.session.physicianRole === "admin") return true;
  if (rx.physicianID && rx.physicianID._id && rx.physicianID._id.toString() === req.session.physicianId.toString()) return true;
  return false;
}

// EDIT FORM
router.get("/:id/edit", async (req, res) => {
  const rx = await Prescription.findById(req.params.id).populate("physicianID").populate("patientID").lean();
  if (!rx) return res.status(404).send("Prescription not found");
  if (!canEditPrescription(req, rx)) return res.status(403).send("Unauthorized");

  res.render("prescription-edit", {
    rx,
    user: req.session?.physicianName,
    activePage: "prescriptions"
  });
});

// UPDATE
router.post("/:id/edit", async (req, res) => {
  const rx = await Prescription.findById(req.params.id).populate("physicianID").populate("patientID");
  if (!rx) return res.status(404).send("Prescription not found");
  if (!canEditPrescription(req, rx)) return res.status(403).send("Unauthorized");

  const { medicationName, dosage, frequency, instructions, status, type, startDate, endDate } = req.body;
  rx.medicationName = medicationName;
  rx.dosage = dosage;
  rx.frequency = frequency;
  rx.instructions = instructions;
  rx.status = status;
  rx.type = type;
  rx.startDate = startDate || rx.startDate;
  rx.endDate = endDate || null;
  await rx.save();

  res.redirect("/prescriptions");
});

export default router;
