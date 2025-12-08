// models/Patient.js
import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  age: { type: Number },
  gender: { type: String, required: true },
  contactInfo: {
    phone: String,
    email: String,
    address: String
  },
  // Soft delete support: when true, patient is considered deleted
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Physician' }
}, { timestamps: true });

// Keep `age` consistent with `dob` on save (simple year difference)
// Use a no-arg pre-save hook (synchronous) so Mongoose handles invocation style
patientSchema.pre('save', function() {
  try {
    if (this.dob) {
      const now = new Date();
      const age = now.getFullYear() - this.dob.getFullYear();
      // adjust if birthday hasn't occurred yet this year
      const m = now.getMonth() - this.dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < this.dob.getDate())) {
        this.age = age - 1;
      } else {
        this.age = age;
      }
    }
  } catch (err) {
    // ignore and continue
  }
});

// Compute current medications on the patient by aggregating Prescription
patientSchema.methods.getCurrentMedications = async function() {
  const Prescription = mongoose.model('Prescription');
  const now = new Date();
  const ObjectId = mongoose.Types.ObjectId;
  const pipeline = [
    { $match: {
      patientID: ObjectId(this._id),
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
  return Prescription.aggregate(pipeline);
};

// Aggregate a patient's medical history from structured appointment diagnoses
patientSchema.methods.getMedicalHistory = async function() {
  const Appointment = mongoose.model('Appointment');
  const ObjectId = mongoose.Types.ObjectId;
  const pipeline = [
    { $match: { patientID: ObjectId(this._id) } },
    { $unwind: "$diagnoses" },
    { $group: {
      _id: "$diagnoses.code",
      description: { $first: "$diagnoses.description" },
      firstSeen: { $min: "$diagnoses.recordedAt" },
      lastSeen: { $max: "$diagnoses.recordedAt" },
      chronic: { $max: "$diagnoses.chronic" }
    }},
    { $sort: { firstSeen: 1 } }
  ];
  return Appointment.aggregate(pipeline);
};

const Patient = mongoose.model("Patient", patientSchema);
export default Patient;
