import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import Patient from "../../../models/Patient.js";
import Physician from "../../../models/Physician.js";
import Appointment from "../../../models/Appointment.js";
import Prescription from "../../../models/Prescription.js";
import Billing from "../../../models/Billing.js";

const uri = "mongodb://127.0.0.1:27017/medicalApp";

await mongoose.connect(uri);

// Clear collections first
await Patient.deleteMany({});
await Physician.deleteMany({});
await Appointment.deleteMany({});
await Prescription.deleteMany({});
await Billing.deleteMany({});

// Generate Patients
const patients = [];
for (let i = 0; i < 50; i++) {
  patients.push(await Patient.create({
    name: faker.person.fullName(),
    dob: faker.date.birthdate({ min: 1920, max: 2023, mode: "year" }),
    gender: faker.person.sex(),
    contactInfo: {
      phone: faker.phone.number(),
      email: faker.internet.email(),
      address: faker.location.streetAddress()
    },
    medicalHistory: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => faker.lorem.words()),
    currentMedications: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => faker.lorem.word())
  }));
}

// Generate Physicians
const physicians = [];
const specialties = ["Cardiology", "Dermatology", "Neurology", "Pediatrics", "Oncology"];
for (let i = 0; i < 10; i++) {
  physicians.push(await Physician.create({
    name: faker.person.fullName(),
    specialization: faker.helpers.arrayElement(specialties),
    contactInfo: { phone: faker.phone.number(), email: faker.internet.email() },
    schedule: Array.from({ length: 5 }, () => faker.date.future())
  }));
}

// Generate Appointments
const appointments = [];
for (let i = 0; i < 100; i++) {
  const patient = faker.helpers.arrayElement(patients);
  const physician = faker.helpers.arrayElement(physicians);
  appointments.push(await Appointment.create({
    patientID: patient._id,
    physicianID: physician._id,
    date: faker.date.future(),
    notes: faker.lorem.paragraph(),
    summary: "" // can fill later with AI summarization
  }));
}

// Generate Prescriptions
for (let i = 0; i < 50; i++) {
  const patient = faker.helpers.arrayElement(patients);
  const physician = faker.helpers.arrayElement(physicians);
  await Prescription.create({
    patientID: patient._id,
    physicianID: physician._id,
    medicationName: faker.lorem.word(),
    dosage: `${faker.number.int({ min: 1, max: 3 })}x daily`,
    instructions: faker.lorem.sentence()
  });
}

// Generate Billing
for (const appointment of appointments) {
  await Billing.create({
    appointmentID: appointment._id,
    patientID: appointment.patientID,
    amount: faker.number.int({ min: 50, max: 500 }),
    status: faker.helpers.arrayElement(["Paid", "Due", "Pending"]),
    paymentDate: faker.date.recent(),
    InsuranceProvider: faker.company.name(),
    policyNumber: faker.string.alphanumeric(10),
    coverageAmount: faker.number.int({ min: 20, max: 300 })
  });
}

console.log("Seeding complete!");
mongoose.disconnect();
