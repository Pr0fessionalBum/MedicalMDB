// seed.js
import mongoose from "mongoose";
import Patient from "../../../models/Patient.js";
import Physician from "../../../models/Physician.js";
import Appointment from "../../../models/Appointment.js";
import Prescription from "../../../models/Prescription.js";
import Billing from "../../../models/Billing.js";

const seedData = async () => {
  try {
    
    mongoose.connect("mongodb://127.0.0.1:27017/medicalApp")
      .then(() => console.log("MongoDB connected"))
      .catch(err => console.error("Connection error:", err));
    

    // Clear existing data
    await Patient.deleteMany({});
    await Physician.deleteMany({});
    await Appointment.deleteMany({});
    await Prescription.deleteMany({});
    await Billing.deleteMany({});

    // Patients
    const alice = await Patient.create({
      name: "Alice Johnson",
      dob: new Date("1990-04-15"),
      gender: "Female",
      contactInfo: { phone: "555-1111", email: "alice@example.com", address: "123 Maple St" },
      medicalHistory: ["Asthma"],
      currentMedications: ["Albuterol"]
    });

    const bob = await Patient.create({
      name: "Bob Smith",
      dob: new Date("1985-09-21"),
      gender: "Male",
      contactInfo: { phone: "555-2222", email: "bob@example.com", address: "456 Oak St" },
      medicalHistory: ["Hypertension"],
      currentMedications: ["Lisinopril"]
    });

    // Physicians
    const drEmily = await Physician.create({
      name: "Dr. Emily Clark",
      specialization: "Cardiology",
      contactInfo: { phone: "555-3333", email: "emily@clinic.com" },
      schedule: ["Mon 9-12", "Wed 14-17"]
    });

    const drJames = await Physician.create({
      name: "Dr. James Lee",
      specialization: "Dermatology",
      contactInfo: { phone: "555-4444", email: "james@clinic.com" },
      schedule: ["Tue 10-13", "Thu 15-18"]
    });

    // Appointments
    const appt1 = await Appointment.create({
      patientID: alice._id,
      physicianID: drEmily._id,
      date: new Date("2025-12-01T10:00:00"),
      notes: "Routine checkup, vitals normal",
      summary: "Patient in good health."
    });

    const appt2 = await Appointment.create({
      patientID: bob._id,
      physicianID: drJames._id,
      date: new Date("2025-12-02T14:00:00"),
      notes: "Rash on forearm, prescribed ointment",
      summary: "Mild dermatitis."
    });

    // Prescriptions
    await Prescription.create({
      patientID: alice._id,
      physicianID: drEmily._id,
      medicationName: "Albuterol",
      dosage: "2 puffs as needed",
      instructions: "Use inhaler when short of breath"
    });

    await Prescription.create({
      patientID: bob._id,
      physicianID: drJames._id,
      medicationName: "Hydrocortisone Ointment",
      dosage: "Apply twice daily",
      instructions: "Apply to affected area for 7 days"
    });

    // Billing
    await Billing.create({
      appointmentID: appt1._id,
      patientID: alice._id,
      amount: 150,
      status: "Paid",
      paymentDate: new Date("2025-12-01"),
      InsuranceProvider: "HealthPlus",
      policyNumber: "HP123456",
      coverageAmount: 100
    });

    await Billing.create({
      appointmentID: appt2._id,
      patientID: bob._id,
      amount: 200,
      status: "Pending",
      InsuranceProvider: "MediCare",
      policyNumber: "MC654321",
      coverageAmount: 150
    });

    console.log("Seed data inserted successfully!");
    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

seedData();
