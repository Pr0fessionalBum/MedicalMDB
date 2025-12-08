// models/Prescription.js
import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema({
  patientID: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  physicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Physician", required: true },
  medicationName: { type: String, required: true },
  dosage: String,
  instructions: String,
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  medicationCode: String, // optional canonical code (e.g., RxNorm)
  frequency: String,
  type: String,
  // Soft delete support
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Physician' }
}, { timestamps: true });

// Static helper to get current prescriptions for a patient
prescriptionSchema.statics.getCurrentForPatient = async function(patientId) {
  const now = new Date();
  const ObjectId = mongoose.Types.ObjectId;
  const pipeline = [
    { $match: {
      patientID: ObjectId(patientId),
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gt: now } },
        { status: 'active' }
      ]
    }},
    { $sort: { startDate: -1, createdAt: -1 } },
    { $group: { _id: "$medicationName", latest: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$latest" } }
  ];
  return this.aggregate(pipeline);
};

// No hooks for caching — compute meds dynamically via getCurrentForPatient

const Prescription = mongoose.model("Prescription", prescriptionSchema);
export default Prescription;
