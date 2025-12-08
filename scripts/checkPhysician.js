import mongoose from 'mongoose';
import Physician from '../models/Physician.js';
const MONGO = 'mongodb://127.0.0.1:27017/medicalApp';

async function run() {
  await mongoose.connect(MONGO, { dbName: 'medicalApp' });
  console.log('Connected to MongoDB');

  const p = await Physician.findOne({ username: 'demo_doctor' }).lean();
  if (!p) {
    console.log('Physician not found: demo_doctor');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('Found physician document:');
  console.log({ _id: p._id, username: p.username, passwordHash_preview: p.passwordHash ? p.passwordHash.substring(0, 60) : p.passwordHash });

  const bcrypt = await import('bcrypt');
  const isHash = typeof p.passwordHash === 'string' && p.passwordHash.startsWith('$2');
  console.log('passwordHash looks like bcrypt hash:', isHash);

  if (p.passwordHash) {
    try {
      const ok = await bcrypt.compare('password123', p.passwordHash);
      console.log('bcrypt.compare("password123", passwordHash) =>', ok);
    } catch (err) {
      console.error('Error comparing password:', err);
    }
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
