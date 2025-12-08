import mongoose from "mongoose";
import bcrypt from 'bcrypt';

const physicianSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  contactInfo: {
    phone: String,
    email: String
  },
  schedule: [String],
  // Authentication fields
  username: { type: String, unique: true, sparse: true },
  passwordHash: String,
  role: { type: String, enum: ['physician', 'admin'], default: 'physician' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to hash password (async/await style - more robust across Mongoose versions)
physicianSchema.pre('save', async function() {
  // `this` is the document
  if (!this.isModified('passwordHash')) return;
  if (!this.passwordHash) return;
  // already hashed?
  if (typeof this.passwordHash === 'string' && this.passwordHash.startsWith('$2')) return;

  const hash = await bcrypt.hash(this.passwordHash, 10);
  this.passwordHash = hash;
});

// Method to verify password
physicianSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

const Physician = mongoose.model("Physician", physicianSchema);
export default Physician;

// Indexes to speed common lookups
physicianSchema.index({ name: 1 });
physicianSchema.index({ "contactInfo.email": 1 });
physicianSchema.index({ specialization: 1 });
