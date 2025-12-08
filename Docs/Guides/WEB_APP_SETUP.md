# Medical Database Web App - Setup & Current Features

## Quick Start

The app runs on http://localhost:3000 by default. Start it after installing dependencies:

```bash
npm install
node server.js
```

Note: `package.json` uses ESM (`"type": "module"`) so the app is started with `node server.js`.

## What this app currently provides

- Authentication: login for physicians and a guest patient flow (guest patient can log in using their email/password). Demo accounts such as `demo_admin` are seeded by the data generator.
- Protected routes: most data routes require an authenticated session (middleware enforces a physician or guest session).
- CRUD-related UI and permissions:
  - Admin users (`role: "admin"`) can create/edit/delete patients, appointments, prescriptions and billings.
  - Regular physicians can view and edit their own profiles and related records when authorized.
  - Guest patients may only view their own profile, appointments, prescriptions and billings.
- Resources available in the UI:
  - Patients: list, detail view (with prescriptions, appointments, billing)
  - Physicians: directory and individual physician profile (schedule, recent activity)
  - Prescriptions: list, edit (status, dates, dosage)
  - Appointments: list, detail, create/edit (admin-only edits)
  - Billings: list, detail, create/edit (admin-only edits); totals/summary computed server-side

## Project Structure (high level)

```
MedicalMDB/
├── server.js               # Express server (listens on port 3000)
├── package.json            # Dependencies and project metadata
├── utils/                  # DB connection and helper utils
├── models/                 # Mongoose models (Patient, Physician, Prescription, Appointment, Billing)
├── routes/                 # Route handlers (auth, patients, physicians, prescriptions, appointments, billings, search)
├── views/                  # EJS templates and partials
└── public/                 # Static assets (CSS, client JS)
```

## Important routes and API surface

- Authentication:
  - `GET /login` - login page (shows demo users)
  - `POST /login` - perform login (physician username or patient email)
  - `GET /logout` - logout (destroys session)
  - `GET /account` - redirect to the logged-in physician's profile (protected)

- Main resource pages (protected by session middleware):
  - `GET /patients` - patients list (filters, pagination, AJAX partials)
  - `GET /patients/:id` - patient detail (prescriptions, appointments, billings)
  - `GET /physicians` - physicians list
  - `GET /physicians/:id` - physician profile
  - `GET /prescriptions` - prescriptions list
  - `GET /appointments` - appointments list
  - `GET /billings` - billing records and totals

- Search API (protected):
  - `GET /api/...` - used by client-side code for searching/filtering (see `routes/search.js`)

## Query parameters and AJAX

Most list pages support common query parameters:

- `search` — text search across names/fields
- `sort` — which field to sort by (page-specific)
- `order` — `asc` or `desc` (sorting direction)
- `page` — page number for pagination
- `limit` — items per page
- `ajax=1` — request partial HTML / JSON for client-side updates

Examples:

- `/patients?search=John&sort=age&page=2&limit=10`
- `/prescriptions?search=Aspirin&status=active&ajax=1`

When `ajax=1` the route often returns rendered partial rows and pagination HTML as JSON (used by the UI for live updates).

## Database connection

- Default MongoDB URI used by the app: `mongodb://127.0.0.1:27017/medicalApp` (see `utils/db.js`).
- Ensure MongoDB is running locally before starting the server.

## Seeding the database (sample/demo data)

- A data seeder is provided at `Data/seed.js`. It uses `Data/medicine.json` and generates:
  - demo physicians (including `demo_admin`) and many randomized physicians
  - patients with DOB/age, contact info
  - prescriptions, appointments, and billings with realistic timestamps and statuses

- To seed (from project root):

```bash
node Data/seed.js 50   # creates ~50 patients plus related records
```

After seeding, start the server and log in as `demo_admin` with password `password123`.

## Permissions & behavior details

- Sessions: the app uses `express-session`; session fields include `physicianId`, `physicianRole`, `physicianName`, and `guestPatientId` for guest logins.
- Guest patient flow: if a patient logs in (via their email and password) they are given a `guestPatientId` and can only view their own resources; the UI redirects guest users to their patient detail page.
- Admin-only actions: creation, editing and deletion of most records are restricted to admin users (server enforces checks in routes).

## How to run locally

1. Make sure MongoDB is running locally and accessible at `mongodb://127.0.0.1:27017`.
2. Install dependencies:

```bash
npm install
```

3. (Optional) Seed demo data:

```bash
node Data/seed.js 20
```

4. Start the app:

```bash
node server.js
```

5. Open `http://localhost:3000` in your browser and log in (`/login`).

## Notes & next improvements

- `package.json` currently does not include an `npm start` script — adding one (e.g. `"start": "node server.js"`) can make starting the app simpler.
- Consider adding environment variable support for Mongo URI, session secret, and port (currently hard-coded in `utils/db.js` and `server.js`).
- For production use, switch sessions to a persistent store, enable HTTPS, and secure secrets.

---

If you'd like, I can:

- add an `npm start` script to `package.json` and create a `.env`-based configuration, or
- update the guide further to include screenshots or a short walkthrough for admin tasks.

