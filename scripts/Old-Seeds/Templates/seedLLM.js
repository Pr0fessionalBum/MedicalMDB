import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import fs from 'fs/promises';

import Patient from '../../../models/Patient.js';
import Physician from '../../../models/Physician.js';
import Prescription from '../../../models/Prescription.js';
import Appointment from '../../../models/Appointment.js';

const MONGO = 'mongodb://127.0.0.1:27017/medicalApp';

// Load the meds dataset once at startup
async function loadMedications() {
  const raw = await fs.readFile('./medicine.json', 'utf8');
  const data = JSON.parse(raw);
  // data is an object keyed by ID, so convert to an array
  const meds = Object.values(data).map(item => ({
    name: item["Name"],
    generic: item["Generic Name"],
    type: item["Type"],
    mg: item["MG"],
    company: item["Company Name"]
  }));
  return meds;
}

// Ollama configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'neural-chat';

// Call Ollama for text generation
async function generateWithOllama(prompt) {
  try {
    console.log(`[Ollama] Generating with ${OLLAMA_MODEL}...`);
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status}`);
    }

    const data = await res.json();
    return data.response?.trim() || '';
  } catch (err) {
    console.error('Ollama error:', err.message);
    // Fallback to templates if Ollama is unavailable
    return null;
  }
}

// Template-based generation — fallback if Ollama unavailable
const prescriptionInstructions = [
  'Take ${dosage} by mouth once daily with food.',
  'Take ${dosage} orally twice daily as prescribed.',
  'Apply to affected area ${dosage} times per day.',
  'Take ${dosage} as needed for symptoms, up to 3 times daily.',
  'Inhale ${dosage} puffs every 4-6 hours as needed.',
  'Take ${dosage} once at bedtime.',
  'Take ${dosage} twice daily, morning and evening.',
  'Take ${dosage} with water, do not crush or chew.'
];

const assessmentTemplates = [
  '${age}-year-old ${gender} patient presenting for follow-up of ${diagnosis}. Currently stable on current regimen. Vital signs within normal limits.',
  'Patient doing well on ${med} for ${diagnosis}. No new symptoms reported. Physical exam unremarkable.',
  '${diagnosis} adequately controlled with current medication. Patient compliant with treatment. Continue present management.',
  'Follow-up visit for ${diagnosis}. Patient reports good tolerance of ${med}. Lab results stable.',
  'Patient with ${diagnosis} evaluated today. Clinically improved since last visit. Continue current therapy.'
];

const planTemplates = [
  'Continue ${med} as prescribed. Follow-up in 3 months. Patient counseled on medication adherence.',
  'Refill prescription for ${med}. Recheck ${test} in 6 weeks. Return PRN or if symptoms worsen.',
  'Continue current medications. Lifestyle modifications recommended. Schedule follow-up appointment in 1-2 months.',
  'Maintain present regimen. Will monitor ${test} trend. Patient to return for routine visit in 3 months.',
  'Continue ${med} therapy. Discussed side effects and warning signs. Advised to contact office with concerns.'
];

const diagnosisOptions = [
  { code: 'I10', description: 'Essential hypertension', chronic: true },
  { code: 'E11', description: 'Type 2 diabetes mellitus', chronic: true },
  { code: 'I50', description: 'Heart failure', chronic: true },
  { code: 'J45', description: 'Asthma', chronic: true },
  { code: 'E78', description: 'Hyperlipidemia', chronic: true },
  { code: 'M79.3', description: 'Myalgia', chronic: false },
  { code: 'J06', description: 'Acute upper respiratory infection', chronic: false },
  { code: 'M54.5', description: 'Low back pain', chronic: false },
  { code: 'E04', description: 'Thyroid disorder', chronic: true },
  { code: 'F41', description: 'Anxiety disorder', chronic: true }
];

function generatePrescriptionInstructionsFallback(dosage) {
  const template = faker.helpers.arrayElement(prescriptionInstructions);
  return template.replace('${dosage}', dosage);
}

function generateClinicalNoteFallback(age, gender, med, diagnosis) {
  const assessment = faker.helpers.arrayElement(assessmentTemplates)
    .replace('${age}', age)
    .replace('${gender}', gender)
    .replace('${diagnosis}', diagnosis.description)
    .replace('${med}', med);
  
  const plan = faker.helpers.arrayElement(planTemplates)
    .replace('${med}', med)
    .replace('${test}', faker.helpers.arrayElement(['labs', 'BP', 'glucose', 'lipid panel']));
  
  return `ASSESSMENT:\n${assessment}\n\nPLAN:\n${plan}`;
}

// Generate prescription instructions (Ollama or fallback)
async function generatePrescriptionInstructions(dosage, medication) {
  const prompt = `You are a licensed physician writing prescription instructions. Write concise, clinical, and medically accurate instructions for ${medication} ${dosage}. Include: route of administration, frequency, and any relevant precautions. Keep to 1-2 sentences. Use professional medical language.`;
  const ollama = await generateWithOllama(prompt);
  return ollama || generatePrescriptionInstructionsFallback(dosage);
}

// Generate clinical note (Ollama or fallback)
async function generateClinicalNote(age, gender, med, diagnosis) {
  const prompt = `You are a physician documenting a clinical visit. Write a concise, comprehensive clinical note for a ${age}-year-old ${gender} patient with ${diagnosis.description} managed on ${med}. Format: Begin with 1-2 sentence chief complaint/assessment of current status. Include relevant clinical observations (vital signs status, symptom control, medication tolerance). End with clear, specific plan (medication continuation, monitoring intervals, follow-up). Use clinical terminology. Keep under 150 words. Be direct and thorough.`;
  const ollama = await generateWithOllama(prompt);
  return ollama || generateClinicalNoteFallback(age, gender, med, diagnosis);
}


function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed({ patients = 5, physicians = 3, maxPrescriptions = 3, maxAppointments = 4 } = {}) {
  await mongoose.connect(MONGO, { dbName: 'medicalApp' });
  console.log('Connected to', MONGO);

  await Patient.deleteMany({});
  await Physician.deleteMany({});
  await Prescription.deleteMany({});
  await Appointment.deleteMany({});

  const physicianDocs = [];
  for (let i = 0; i < physicians; i++) {
    const doc = new Physician({
      name: faker.person.fullName(),
      specialization: faker.helpers.arrayElement(['Cardiology', 'Dermatology', 'Pediatrics', 'General Practice']),
      contactInfo: { phone: faker.phone.number(), email: faker.internet.email() },
      schedule: []
    });
    await doc.save();
    physicianDocs.push(doc);
  }

  const allMeds = await loadMedications();

  for (let i = 0; i < patients; i++) {
    const patient = new Patient({
      name: faker.person.fullName(),
      dob: faker.date.birthdate({ min: 1940, max: 2005, mode: 'year' }),
      gender: faker.person.sex(),
      contactInfo: {
        phone: faker.phone.number(),
        email: faker.internet.email(),
        address: faker.location.streetAddress()
      }
    });
    await patient.save();

    const age = new Date().getFullYear() - patient.dob.getFullYear();

    // Create prescriptions based on random meds from dataset
    const rxCount = faker.number.int({ min: 1, max: maxPrescriptions });
    for (let r = 0; r < rxCount; r++) {
      const med = getRandomElement(allMeds);
      const dosage = med.mg; // or derive differently
      const instructions = await generatePrescriptionInstructions(dosage, med.name);

      const pres = new Prescription({
        patientID: patient._id,
        physicianID: getRandomElement(physicianDocs)._id,
        medicationName: med.name,
        dosage,
        instructions,
        startDate: faker.date.past({ years: 3 }),
        endDate: null,
        status: 'active',
        medicationCode: med.generic,  // optionally store generic name or code
        frequency: 'As directed',
        type: med.type || 'Oral'
      });
      await pres.save();
    }

    // Create up to maxAppointments appointments for this patient
    for (let a = 0; a < maxAppointments; a++) {
      // Pick a random prescription for context
      const med = getRandomElement(allMeds);
      const diagnosis = faker.helpers.arrayElement(diagnosisOptions);
      const notes = await generateClinicalNote(age, patient.gender, med.name, diagnosis);

      const appt = new Appointment({
        patientID: patient._id,
        physicianID: getRandomElement(physicianDocs)._id,
        date: faker.date.recent({ days: 365 }),
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
    }

    console.log(`Seeded patient ${patient._id} (${patient.name})`);
  }

  await mongoose.disconnect();
  console.log('Seeding complete.');
}

if (process.argv[1].endsWith('seedLLM.js')) {
  const patients = process.argv[2] ? Number(process.argv[2]) : 5;
  seed({ patients }).catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
