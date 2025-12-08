import mongoose from 'mongoose';
import Physician from './models/Physician.js';

const MONGO = 'mongodb://127.0.0.1:27017/medicalApp';

async function listAccounts() {
  await mongoose.connect(MONGO, { dbName: 'medicalApp' });
  console.log('Connected to MongoDB\n');

  const physicians = await Physician.find({}, 'name username isActive').sort({ username: 1 }).lean();

  if (physicians.length === 0) {
    console.log('No physician accounts found. Run seeder first.');
    await mongoose.disconnect();
    return;
  }

  console.log('📋 Available Physician Accounts:');
  console.log('─'.repeat(70));
  console.log('Username                          | Name                        | Active');
  console.log('─'.repeat(70));

  physicians.forEach(p => {
    const username = (p.username || 'N/A').padEnd(33);
    const name = (p.name || 'Unknown').padEnd(27);
    const active = p.isActive ? '✓' : '✗';
    console.log(`${username} | ${name} | ${active}`);
  });

  console.log('─'.repeat(70));
  console.log(`\nTotal: ${physicians.length} physician(s)\n`);
  console.log('🔐 Default Password: password123\n');
  console.log('💡 Tip: You can login with any username + password123 at http://localhost:3000/login\n');

  await mongoose.disconnect();
}

listAccounts().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
