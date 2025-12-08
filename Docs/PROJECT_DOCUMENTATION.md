## MedicalMDB Project Documentation

### Overview
MedicalMDB is a web-based medical records manager that supports patients, physicians, appointments, prescriptions, and billings with role-aware access (admin/physician/guest-patient). It provides CRUD operations, searchable/sortable/paginated lists, cross-linked detail pages, and data seeding for demos.

**Motivation and Positioning**  
Small clinics often lack lightweight tooling to view and update clinical data quickly. Commercial EMRs (e.g., Epic) are comprehensive but heavy and costly. MedicalMDB focuses on a slimmer footprint: fast lookup of patient data, appointments, prescriptions, and billing, with clear role controls and guest-patient self-service. Data is synthetic to avoid PHI and to enable safe demos.

**How it differs from Epic-like systems**  
- Narrow, focused scope (visits, meds, billing) instead of a full suite.  
- Role-aware guest access so patients can view their own records without exposing others.  
- AJAX-first list views for speed and lower reload overhead.  
- Seeded/demo-friendly setup for classroom or small-clinic pilots.

### Entities & Relationships
- **Patient**: `_id`, name, dob, age, gender, contactInfo (phone, email, address), passwordHash, isDeleted, deletedAt/By.  
  - Relationships: 1–M Appointments, 1–M Prescriptions, 1–M Billings (via appointment).
- **Physician**: `_id`, name, specialization, contactInfo (phone, email), schedule, username, passwordHash, role (`physician`/`admin`), isActive, createdAt.  
  - Relationships: 1–M Appointments, 1–M Prescriptions, 1–M Billings (indirect via appointment).
- **Appointment**: `_id`, patientID→Patient, physicianID→Physician, date, summary, notes, diagnoses[{ code, description, chronic, recordedAt }], isDeleted, deletedAt/By, timestamps.  
  - Relationships: 1–M Billings.
- **Prescription**: `_id`, patientID→Patient, physicianID→Physician, medicationName/code, dosage, frequency, instructions, status (`active`/`completed`), type, startDate, endDate, isDeleted.  
- **Billing**: `_id`, appointmentID→Appointment, patientID→Patient, amount, status (`Paid`/`Pending`/`Due`), paymentDate, InsuranceProvider, policyNumber, coverageAmount, isDeleted.

### Key Features (Basic)
- CRUD: create/edit/delete patients, physicians, appointments, prescriptions, billings (soft-delete on core entities).
- Search & Filters: live search and filters per module (e.g., gender/age for patients; status/type for prescriptions; status for billings; diagnosis code/text for appointments).
- Sorting & Pagination: sortable headers with direction toggle; paginated lists (10 default).
- Joins in Listings: appointments show patient/physician names; prescriptions show patient/physician; billings show patient and appointment link.
- Detail Pages: patient/physician detail with related appointments/prescriptions/billings; appointment detail with linked billings; billing detail with linked appointment/patient.
- Auth/Roles: physician login (username/password); guest-patient login (email/password) limited to their own data; admin role for full access.

### Advanced / Differentiating
- Role-based guest patient access (self-serve view of their own physicians/appointments/prescriptions/billings).
- AJAX-enhanced tables: live search and in-place updates on filter/sort/page.
- Cross-linking with modal notes and detail pages.
- Optional to strengthen: analytics dashboard (trends by week, billing totals by status, top diagnoses) and/or smart scheduling (conflict detection + suggestions). These are recommended as “advanced” showcase items beyond role-based access.

### Data & Seeding
- Seeder: `Data/seed.js` uses faker + `Data/medicine.json`; creates physicians (including `demo_admin` and `demo_doctor`), patients with hashed password `password123`, appointments, prescriptions, and billings with insurer reuse per patient; billing amounts bumped high with variability.
- Templates: `Data/templates.js` provides varied clinical note and prescription text plus diagnosis options.

### Performance Considerations & Structure
- **Indexes (conceptual)**: Lists are optimized by indexing the fields most often filtered/sorted: soft-delete flags, foreign keys (patientID, physicianID), dates, and searchable text fields (names, emails). Patients and physicians also index contact info for search.
- **Projections in list queries**: Aggregations for appointments/prescriptions drop heavy or unused fields (e.g., notes, timestamps) to reduce payload size and improve render speed.
- **Caching**: Diagnosis code options are cached in memory for the appointments filter to avoid repeated `distinct` calls.
- **Soft-delete pattern**: Core collections (patients, appointments, prescriptions, billings) use `isDeleted` to hide records without hard deletion.

### Technology Stack
- DB: MongoDB (Mongoose models).
- Backend: Node.js + Express.
- Views: EJS with partial navbar, table rows.
- Frontend: CSS (`public/style.css`), AJAX helper (`public/js/table-ajax.js`), smart-search styles.
- Utilities: `utils/pagination.js` and `utils/query.js` for pagination links.

### Authentication & Authorization
- Physician login via username/password; passwords hashed (bcrypt).
- Patient guest login via email/password; session stores `guestPatientId`; all list/detail routes constrain data when guest.
- Admin role: can edit across entities; physicians now **cannot delete or edit billings**, and cannot delete any records (patients/appointments/billings/prescriptions); guests read-only on own data.
- UI hides edit/delete buttons when the current user is not an admin.

### Routes (High-Level)
- `/patients`: list/search/sort/paginate; create/edit/delete; detail shows related prescriptions/appointments/billings.
- `/physicians`: list/search/sort/paginate; detail with schedule, related items.
- `/appointments`: list/search/sort (date/diagnosis), filter by diagnosis; create/edit/delete; detail with billings.
- `/prescriptions`: list/search/sort/filter; create/edit; uses partial row for rendering.
- `/billings`: list/search/sort/filter; create/edit/delete; detail with appointment/patient link.
- `/login`, `/logout`, `/account`.

### DB Schema Notes
- Soft-delete fields on core collections.
- Diagnoses embedded in Appointment; denormalized sort keys in aggregates (patientName, physicianName, diagCode).
- Billing references both appointmentID and patientID for direct filtering.

### Seeding Defaults
- Physician accounts: generated usernames; demo accounts `demo_admin` (admin) and `demo_doctor` (physician), password `password123`.
- Patient accounts: email + password `password123`.
- Billing amounts: higher base with variability; insurer pool per patient reused across bills.

### Potential Advanced Feature Ideas (pick one if needed)
- **Analytics dashboard**: visit volume by week, billing totals by status, top diagnoses, average billing per specialization.
- **Smart scheduling**: conflict detection + suggested slots per physician; compact, scrollable schedule view.
- **Recommendation/alerts**: flag overdue bills; suggest follow-up based on diagnosis; simple interaction checker for meds.

### Development Milestones (example)
- M1: ERD/schema finalized; indexes defined; seed working.
- M2: Auth/roles; patients/physicians CRUD; navbar/partials. **(Done)**
- M3: Appointments/prescriptions CRUD; list filters/sorts/pagination. **(Done)**
- M4: Billing CRUD; totals; detail cross-links. **(Done)**
- M5: Restrict permissions (admin-only edits/deletes) and hide buttons for non-admins. **(Done)**
- M6 (optional advanced): Add analytics dashboard or smart scheduling; polish UI; testing/demo.

### Demo Checklist
- CRUD demo for each entity (insert/update/delete).
- Search/sort with joins (appointments showing patient/physician; prescriptions with patient/physician; billings with patient).
- Advanced feature (role-based guest + optional analytics/scheduling) demonstrated.
- Guest patient login restricted view.
- Pagination and AJAX sorting/filtering in tables.

### Changes Since Initial Plan (what changed and why)
- **Access control tightened:** Physicians can no longer delete anything and cannot edit/delete billings; only admin can perform destructive actions. Rationale: safer multi-user environment and clearer separation of duties.
- **Guest patient view added:** Patients can log in with their email/password to see only their own data. Rationale: patient self-service without exposing others.
- **Performance improvements:** Added indexes on appointments/patients/physicians; projections in list queries to reduce payload; cached diagnosis options; AJAX-only sort/filter for lighter UI updates. Rationale: faster loads for the largest sections (appointments, prescriptions).
- **UI consistency:** Shared navbar, consistent sort headers/arrows, ghost view buttons, and removal of corrupted header glyphs. Rationale: usability and clarity.
- **Seed data enhancements:** Higher billing amounts, insurer reuse per patient, expanded templates for varied notes/diagnoses, added demo accounts (`demo_admin`, `demo_doctor`). Rationale: more realistic demos and predictable logins.
- **Advanced feature shift:** Original AI summarization concept deferred (no external API dependency). Recommended advanced items now: analytics dashboard or smart scheduling. Rationale: keep the project self-contained and technically demonstrable.
- **Data generation change:** Switched from AI-generated data to faker + template-driven synthetic data for speed and cost reasons; seeding is now fast, repeatable, and offline.
