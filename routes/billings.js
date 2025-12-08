// /routes/billings.js
import express from "express";
import mongoose from "mongoose";
import Billing from "../models/Billing.js";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import { renderPagination } from "../utils/pagination.js";
import { paginationQuery } from "../utils/query.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const guestPatientId = req.session?.guestPatientId;
    const guestObjectId = guestPatientId ? new mongoose.Types.ObjectId(guestPatientId) : null;
    const {
      search = "",
      sort = "status",
      page = 1,
      limit = 10,
      ajax = "",
      order = "desc",
      status = ""
    } = req.query;

    const query = { isDeleted: false };
    if (guestObjectId) query.patientID = guestObjectId;

    if (status) query.status = status;

    if (search) {
      const regex = new RegExp(search, "i");
      const patientIds = await Patient.find({ name: regex }).distinct("_id");
      const ors = [{ status: regex }];

      if (patientIds.length) ors.push({ patientID: { $in: patientIds } });

      const parsed = Date.parse(search);
      if (!Number.isNaN(parsed)) {
        const start = new Date(parsed);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        ors.push({ paymentDate: { $gte: start, $lt: end } });
      }

      query.$or = ors;
    }

    if (status) query.status = status;

    const dir = order === "asc" ? 1 : -1;
    const sortOption =
      sort === "status"
        ? { status: dir }
        : sort === "amount"
        ? { amount: dir }
        : { createdAt: dir };

    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNum - 1) * pageSize;

    const totalCount = await Billing.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);
    const billingsCanEdit = req.session?.physicianRole === "admin";

    // totals across all matching records
    const totalsAgg = await Billing.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $toDouble: "$amount" } },
          totalPaid: { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, { $toDouble: "$amount" }, 0] } },
          totalPending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, { $toDouble: "$amount" }, 0] } },
          totalDue: { $sum: { $cond: [{ $eq: ["$status", "Due"] }, { $toDouble: "$amount" }, 0] } },
        }
      }
    ]);
    const totals =
      totalsAgg[0] || { totalAmount: 0, totalPaid: 0, totalPending: 0, totalDue: 0 };

    const billings = await Billing.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(pageSize)
      .select("amount status createdAt paymentDate InsuranceProvider patientID appointmentID")
      .populate("patientID", "name")
      .lean();

    // AJAX MODE
    if (ajax) {
      return res.render("partials/billing-row", { billings, billingsCanEdit }, (err, rowsHtml) => {
        if (err) return res.json({ error: err.message });

        const paginationHtml = renderPagination(req, "/billings", pageNum, totalPages);

        res.json({
          rowsHtml,
          paginationHtml,
          count: billings.length,
          totalCount,
          totals,
        });
      });
    }

    res.render("billings", {
      billings,
      search,
      sort,
      order,
      status,
      page: pageNum,
      limit: pageSize,
      totalPages,
      totalCount,
      totals,
      query: req.query,
      user: req.session.physicianName,
      req,
      renderPagination,
      paginationQuery,
      billingsCanEdit,
    });

  } catch (err) {
    res.status(500).send("Error fetching billings");
  }
});

function canEditBilling(req, billing, appointment) {
  if (!req.session?.physicianId) return false;
  if (req.session.physicianRole === "admin") return true;
  if (appointment?.physicianID?.toString() === req.session.physicianId.toString()) return true;
  return false;
}

// EDIT FORM
router.get("/:id/edit", async (req, res) => {
  const billing = await Billing.findById(req.params.id).lean();
  if (!billing) return res.status(404).send("Billing not found");
  const appointment = await Appointment.findById(billing.appointmentID).lean();
  if (!canEditBilling(req, billing, appointment)) return res.status(403).send("Unauthorized");

  res.render("billing-edit", {
    billing,
    activePage: "billings",
    user: req.session.physicianName,
  });
});

// UPDATE
router.post("/:id/edit", async (req, res) => {
  const billing = await Billing.findById(req.params.id);
  if (!billing) return res.status(404).send("Billing not found");
  const appointment = await Appointment.findById(billing.appointmentID).lean();
  if (!canEditBilling(req, billing, appointment)) return res.status(403).send("Unauthorized");

  const { amount, status, paymentDate } = req.body;
  billing.amount = amount;
  billing.status = status;
  billing.paymentDate = paymentDate || null;
  await billing.save();

  res.redirect("/billings");
});

// DETAIL VIEW
router.get("/:id", async (req, res) => {
  const billing = await Billing.findById(req.params.id)
    .populate("patientID")
    .lean();

  if (!billing || billing.isDeleted) return res.status(404).send("Billing not found");

  if (req.session?.guestPatientId && billing.patientID?._id?.toString() !== req.session.guestPatientId.toString()) {
    return res.status(403).send("Guests can only view their own billings");
  }

  const appointment = await Appointment.findById(billing.appointmentID)
    .populate("patientID")
    .populate("physicianID")
    .lean();

  const billingsCanEdit = canEditBilling(req, billing, appointment);

  res.render("billing-detail", {
    billing,
    appointment,
    billingsCanEdit,
    activePage: "billings",
    user: req.session.physicianName,
  });
});

// DELETE BILLING
router.post("/:id/delete", async (req, res) => {
  try {
    await Billing.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.session.physicianId,
    });

    res.redirect("/billings");

  } catch (err) {
    res.status(500).send("Error deleting billing");
  }
});

export default router;
