import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  patientID: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  physicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Physician", required: true },
  date: { type: Date, required: true },
  notes: { type: String },
  summary: { type: String },
  diagnoses: [{
    code: String, // ICD-10 or other code
    description: String,
    chronic: { type: Boolean, default: false },
    recordedAt: { type: Date, default: function() { return this.parent().date; } } // defaults to appointment date
  }],
  // Soft delete support
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Physician' }
}, { timestamps: true });

// Helpful indexes to speed common list queries and filters
appointmentSchema.index({ isDeleted: 1, date: -1 });
appointmentSchema.index({ isDeleted: 1, patientID: 1, date: -1 });
appointmentSchema.index({ isDeleted: 1, physicianID: 1, date: -1 });
appointmentSchema.index({ isDeleted: 1, "diagnoses.code": 1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
