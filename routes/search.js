// /routes/search.js
import express from "express";
import Patient from "../models/Patient.js";
import Physician from "../models/Physician.js";
import Prescription from "../models/Prescription.js";

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const { q = "", limit = 10 } = req.query;

    if (!q || q.length < 2) return res.json([]);

    const regex = new RegExp(q, "i");

    const [patients, physicians, prescriptions] = await Promise.all([
      Patient.find({ isDeleted: false, name: regex })
        .select("_id name")
        .limit(limit / 3),

      Physician.find({ isActive: true, name: regex })
        .select("_id name specialization")
        .limit(limit / 3),

      Prescription.find({ isDeleted: false, medicationName: regex })
        .select("_id medicationName")
        .limit(limit / 3),
    ]);

    const results = [
      ...patients.map(p => ({
        type: "patient",
        id: p._id,
        label: `Patient: ${p.name}`,
        name: p.name,
      })),

      ...physicians.map(p => ({
        type: "physician",
        id: p._id,
        label: `Dr. ${p.name} (${p.specialization})`,
        name: p.name,
      })),

      ...prescriptions.map(rx => ({
        type: "prescription",
        id: rx._id,
        label: `Rx: ${rx.medicationName}`,
        name: rx.medicationName,
      })),
    ];

    res.json(results.slice(0, limit));

  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
