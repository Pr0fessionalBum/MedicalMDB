import mongoose from 'mongoose';
import Physician from '../../models/Physician.js';
const MONGO = 'mongodb://127.0.0.1:27017/medicalApp';

async function run() {
  await mongoose.connect(MONGO, { dbName: 'medicalApp' });
  console.log('Connected to MongoDB');

  const plainUsers = await Physician.find({ username: 'demo_doctor' });
  if (!plainUsers || plainUsers.length === 0) {
    console.log('No demo_doctor users found');
    await mongoose.disconnect();
    return;
  }

  const bcrypt = await import('bcrypt');

  for (const user of plainUsers) {
    const ph = user.passwordHash;
    if (typeof ph === 'string' && !ph.startsWith('$2')) {
      console.log('Hashing password for user:', user.username);
      const newHash = await bcrypt.hash(ph, 10);
      // Use updateOne to avoid triggering pre-save hooks which may expect different signatures
      await Physician.updateOne({ _id: user._id }, { $set: { passwordHash: newHash } });
      console.log('Updated hash for', user.username);
    } else {
      console.log('User already hashed:', user.username);
    }
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fix failed:', err);
  process.exit(1);
});
