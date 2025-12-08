import mongoose from 'mongoose';
import Physician from './models/Physician.js';

const MONGO = 'mongodb://127.0.0.1:27017/medicalApp';

async function setupDemo() {
  await mongoose.connect(MONGO, { dbName: 'medicalApp' });
  console.log('Connected to MongoDB');

  // Check if demo account already exists
  const existing = await Physician.findOne({ username: 'demo_doctor' });
  if (existing) {
    console.log('Demo account already exists');
    await mongoose.disconnect();
    return;
  }

  // Create demo physician - explicitly hash password here to ensure it's stored hashed
  const bcrypt = await import('bcrypt');
  const plain = 'password123';
  const hashed = await bcrypt.hash(plain, 10);

  const demoPhysician = new Physician({
    name: 'Dr. Demo Smith',
    specialization: 'General Practice',
    username: 'demo_doctor',
    passwordHash: hashed,
    contactInfo: {
      phone: '+1 (555) 123-4567',
      email: 'demo@hospital.com'
    },
    schedule: ['Mon 08:00-12:00', 'Wed 09:00-13:00', 'Fri 12:30-16:30']
  });

  await demoPhysician.save();
  console.log('Demo physician created:');
  console.log('Username: demo_doctor');
  console.log('Password: password123');

  await mongoose.disconnect();
  console.log('Setup complete');
}

setupDemo().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
