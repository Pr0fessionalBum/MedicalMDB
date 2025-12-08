import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';

import Patient from './models/Patient.js';
import Physician from './models/Physician.js';
import Prescription from './models/Prescription.js';
import Appointment from './models/Appointment.js';
import Billing from './models/Billing.js';
import { 
  diagnosisOptions,
  generatePrescriptionWithFrequency,
  generateClinicalNoteFromTemplate
} from './templates.js';

const MONGO = 'mongodb://127.0.0.1:27017/medicalApp';

// Load the meds dataset once at startup
async function loadMedications() {
  const raw = await fs.readFile('./medicine.json', 'utf8');
  const data = JSON.parse(raw);
  const meds = Object.values(data).map(item => ({
    name: item["Name"],
    generic: item["Generic Name"],
    type: item["Type"],
    mg: item["MG"],
    company: item["Company Name"]
  }));
  return meds;
}


function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed({ patients = 10, physicians = 20, maxPrescriptions = 20, maxAppointments = 30 } = {}) {
  await mongoose.connect(MONGO, { dbName: 'medicalApp' });
  console.log('Connected to', MONGO);

  await Patient.deleteMany({}); 
  await Physician.deleteMany({});
  await Prescription.deleteMany({});
  await Appointment.deleteMany({});
  await Billing.deleteMany({});

  // Create physicians
  const physicianDocs = [];
  // helper: generate weekly availability slots for a physician
  function generateAvailability(spec) {
    const days = ['Mon','Tue','Wed','Thu','Fri']; 
    const times = ['08:00-12:00','09:00-13:00','12:30-16:30','13:00-17:00'];
    const slots = [];
    const count = Math.floor(Math.random() * 3) + 3; // 3-5 slots
    for (let i = 0; i < count; i++) {
      const day = days[Math.floor(Math.random() * days.length)];
      const time = times[Math.floor(Math.random() * times.length)];
      slots.push(`${day} ${time}`);
    }
    return slots;
  }
  for (let i = 0; i < physicians; i++) {
    const name = faker.person.fullName();
    const spec = faker.helpers.arrayElement(['Cardiology', 'Dermatology', 'Pediatrics', 'General Practice']);
    
    // Generate unique username from name (e.g., "John Smith" -> "john.smith.1")
    const baseUsername = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const username = `${baseUsername}.${i}`;
    // Default password: "password123" hashed
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const doc = new Physician({
      name,
      specialization: spec,
      username,
      passwordHash,
      contactInfo: { phone: faker.phone.number(), email: faker.internet.email() },
      schedule: generateAvailability()
    });
    await doc.save();
    console.log(`  Created physician: ${username} (${name})`);
    physicianDocs.push(doc);
  }

  const allMeds = await loadMedications();

  const appointmentRecords = []; // collect appt + patient for billing and schedules

  // helper: pick an appointment date between patient's DOB and now,
  // biased toward more recent dates but occasionally older
  function pickAppointmentDate(dob) {
    const now = new Date();
    const start = new Date(dob);
    // maximum days between dob and now
    const maxMs = now.getTime() - start.getTime();
    const maxDays = Math.max(1, Math.floor(maxMs / 86400000));

    // bias toward recent dates by using a power transform on rand
    // smaller exponent -> less bias; larger exponent -> stronger bias to recent
    const exponent = 2.2; // tuned to favor recent dates

    // Special rule: reduce the chance of selecting dates after a given year
    // (user requested: make the bias for anything after 1980 much lower chance).
    // We implement this by re-drawing up to `attempts` times and only accepting
    // a post-penalty-year date with probability `postYearAcceptProb`.
    const penaltyYear = 1980; // year after which dates are penalized
    const postYearAcceptProb = 0.2; // only accept post-1980 dates ~20% of the time
    const attempts = 5;

    let lastDate = new Date(start.getTime() + 1000);
    for (let attempt = 0; attempt < attempts; attempt++) {
      const r = Math.random();
      const daysBack = Math.floor(maxDays * Math.pow(r, exponent));
      const date = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      // clamp to not be before dob
      if (date < start) {
        lastDate = new Date(start.getTime() + 1000);
        continue;
      }

      // if date falls after the penalty year, only accept it with a low prob
      if (date.getFullYear() > penaltyYear) {
        if (Math.random() <= postYearAcceptProb) {
          return date;
        } else {
          // keep trying (do not accept this post-year date)
          lastDate = date;
          continue;
        }
      }

      // date is before or equal to penalty year -> accept immediately
      return date;
    }

    // If attempts exhausted, return the last generated date (clamped to DOB)
    return lastDate;
  }

  for (let i = 0; i < patients; i++) {
    // generate DOB and age consistently so age is stored on the patient document
    const dob = faker.date.birthdate({ min: 1940, max: 2005, mode: 'year' });
    // compute age with birthday adjustment
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age = age - 1;
    }

    const patient = new Patient({
      name: faker.person.fullName(),
      dob,
      age,
      gender: faker.person.sex(),
      contactInfo: {
        phone: faker.phone.number(),
        email: faker.internet.email(),
        address: faker.location.streetAddress()
      }
    });
    await patient.save();

    // Create prescriptions based on random meds from dataset
    const rxCount = faker.number.int({ min: 1, max: maxPrescriptions });
    for (let r = 0; r < rxCount; r++) {
      const med = getRandomElement(allMeds);
      const dosage = med.mg; // or derive differently
      // Use generic name for medicationName and for instructions/frequency
      const { instructions, frequency } = generatePrescriptionWithFrequency(dosage, med.generic);

      const pres = new Prescription({
        patientID: patient._id,
        physicianID: getRandomElement(physicianDocs)._id,
        medicationName: med.generic, // use generic name instead of brand name
        dosage,
        instructions,
        startDate: faker.date.past({ years: 3 }),
        endDate: null,
        status: 'active',
        medicationCode: med.generic,  // generic name/code
        frequency,
        type: med.type || 'Oral'
      });
      await pres.save();
    }

    // Create up to maxAppointments appointments for this patient
    const apptCount = faker.number.int({ min: 1, max: maxAppointments });
    for (let a = 0; a < apptCount; a++) {
      const med = getRandomElement(allMeds);
      const diagnosis = faker.helpers.arrayElement(diagnosisOptions);
      const notes = generateClinicalNoteFromTemplate(age, patient.gender, med.name, diagnosis);

      const apptDate = pickAppointmentDate(patient.dob);
      const appt = new Appointment({
        patientID: patient._id,
        physicianID: getRandomElement(physicianDocs)._id,
        date: apptDate,
        notes,
        summary: `${diagnosis.description} follow-up`,
        diagnoses: [{
          description: diagnosis.description,
          code: diagnosis.code,
          chronic: diagnosis.chronic,
          recordedAt: new Date()
        }]
      });
      await appt.save();
        // track appointment + patient name for later billing and schedule updates
        appointmentRecords.push({
          appointment: appt,
          physicianId: appt.physicianID.toString(),
          date: appt.date,
          patientName: patient.name,
          patientId: patient._id
        });
    }

    console.log(`Seeded patient ${patient._id} (${patient.name})`);
  }

  // Create billing entries for each appointment and update physician schedules with booked slots
  const specializationMultiplier = {
    Cardiology: 2.0,
    Dermatology: 1.25,
    Pediatrics: 1.0,
    'General Practice': 1.0
  };

  // Helper: generate an updatedAt date for billing based on status and appointment date
  function generateBillingUpdatedAt(appointmentDate, status, paymentDate) {
    const createdAt = new Date(appointmentDate);
    
    if (status === 'Paid') {
      // if payment was made the same day, updatedAt = createdAt
      // otherwise, updatedAt = paymentDate (when payment occurred)
      const sameDay = 
        paymentDate.getFullYear() === createdAt.getFullYear() &&
        paymentDate.getMonth() === createdAt.getMonth() &&
        paymentDate.getDate() === createdAt.getDate();
      return sameDay ? createdAt : paymentDate;
    } else if (status === 'Pending') {
      // for pending, set updatedAt to a random future date
      // with bias toward sooner (smaller days in future)
      // only a small amount should be years out
      const now = new Date();
      const maxDaysInFuture = 365 * 3; // max 3 years in future
      // use a power distribution (exponent < 1 biases toward sooner)
      const exponent = 0.4; // bias strongly toward near-term
      const r = Math.random();
      const daysInFuture = Math.floor(maxDaysInFuture * Math.pow(r, exponent));
      const updatedAt = new Date(now.getTime() + daysInFuture * 24 * 60 * 60 * 1000);
      return updatedAt;
    } else {
      // 'Due': updatedAt = createdAt for now
      return createdAt;
    }
  }

  for (const rec of appointmentRecords) {
    // find physician doc
    const phys = physicianDocs.find(p => p._id.toString() === rec.physicianId);
    const spec = phys?.specialization || 'General Practice';
  // Increase base fee dramatically to reflect higher billing amounts
  const baseFee = 800; // was 80
    const mult = specializationMultiplier[spec] || 1.0;
  // add a larger variability to amounts so bills can range widely
  const amount = Math.round(baseFee * mult + Math.floor(Math.random() * 600));

    // insurance info sometimes present
    const hasInsurance = Math.random() < 0.8;
    const insuranceProvider = hasInsurance ? faker.company.name() : null;
  // policy number: use faker.string.numeric for stable API across faker versions
  const policyNumber = hasInsurance ? faker.string.numeric(8) : null;
    const coveragePercent = hasInsurance ? (0.5 + Math.random() * 0.45) : 0;
    const coverageAmount = Math.round(amount * coveragePercent);

    const paidRoll = Math.random();
    const status = paidRoll < 0.6 ? 'Paid' : (paidRoll < 0.85 ? 'Pending' : 'Due');
    const paymentDate = status === 'Paid' ? faker.date.recent({ days: 60 }) : null;

    // Generate billing with correct timestamps
    const bill = new Billing({
      appointmentID: rec.appointment._id,
      patientID: rec.patientId,
      amount,
      status,
      paymentDate,
      InsuranceProvider: insuranceProvider,
      policyNumber,
      coverageAmount
    });

    // Set createdAt to appointment date and updatedAt based on status logic
    bill.createdAt = new Date(rec.date);
    bill.updatedAt = generateBillingUpdatedAt(rec.date, status, paymentDate);

    // Save with timestamps disabled to preserve the dates we set
    await bill.save({ timestamps: false });

    // update physician schedule with this booked appointment
    if (phys) {
      const dateStr = new Date(rec.date).toISOString().replace('T', ' ').slice(0,16);
      phys.schedule = phys.schedule || [];
      phys.schedule.push(`Booked ${dateStr} - ${rec.patientName}`);
      await phys.save();
    }
  }

  await mongoose.disconnect();
  console.log('Seeding complete.');
}

if (process.argv[1].endsWith('seed.js')) {
  const patients = process.argv[2] ? Number(process.argv[2]) : 5;
  seed({ patients }).catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
