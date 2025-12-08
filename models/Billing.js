import mongoose from "mongoose";

const billingSchema = new mongoose.Schema({
  appointmentID: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
  patientID: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["Paid", "Due", "Pending"], default: "Pending" },
  paymentDate: Date,
  InsuranceProvider: String,
  policyNumber: String,
  coverageAmount: Number,
  // Soft delete support
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Physician' }
}, { timestamps: true });

const Billing = mongoose.model("Billing", billingSchema);
export default Billing;
