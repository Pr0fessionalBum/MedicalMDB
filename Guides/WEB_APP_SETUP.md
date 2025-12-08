# Medical Database Web App - Setup & Features

## Quick Start

The web app is now running on **http://localhost:3000**

### Features Implemented

✅ **Database Display** - View all records from MongoDB:
- Patients (with DOB, age, gender, contact info)
- Physicians (with specialization, contact, schedule)
- Prescriptions (medication, dosage, frequency, status)
- Appointments (date, summary, diagnoses, clinical notes)
- Billing Records (amount, status, insurance, payment tracking)

✅ **Search & Sort**:
- Search by name/medication/status across all sections
- Sort by multiple fields (name, date, status, amount)
- Real-time filtering with dropdown selectors

✅ **Patient Details View**:
- Click any patient to see full record with:
  - Personal information (DOB, age, gender, contact)
  - All associated prescriptions
  - All associated appointments
  - All associated billing records

✅ **Professional UI**:
- Responsive design (works on mobile/tablet/desktop)
- Clean navigation bar with quick links
- Status badges (Paid, Pending, Due, Active)
- Data tables with hover effects
- Modal popups for detailed information (physician schedules, appointment notes)
- Summary stats (total amount, payment status breakdown)

## Project Structure

```
MedicalMDB/
├── server.js                 # Express server (port 3000)
├── package.json             # Dependencies (express, mongoose, ejs)
├── models/
│   ├── Patient.js
│   ├── Physician.js
│   ├── Prescription.js
│   ├── Appointment.js
│   └── Billing.js
├── views/                   # EJS templates
│   ├── index.ejs           # Home page
│   ├── patients.ejs        # Patients list & search
│   ├── patient-detail.ejs  # Individual patient details
│   ├── physicians.ejs      # Physicians directory
│   ├── prescriptions.ejs   # Prescriptions list
│   ├── appointments.ejs    # Appointments list
│   └── billings.ejs        # Billing records
└── public/
    └── style.css           # Professional styling
```

## Available Routes

| Route | Purpose |
|-------|---------|
| `/` | Home page with quick links |
| `/patients` | List all patients with search/sort |
| `/patients/:id` | Detailed patient view with related data |
| `/physicians` | List all physicians with schedules |
| `/prescriptions` | List all prescriptions with patient links |
| `/appointments` | List all appointments with notes |
| `/billings` | Billing records with stats and summary |

## Query Parameters

All list pages support:
- `?search=<term>` - Filter records
- `?sort=<field>` - Sort by field (field depends on page)

### Examples:
- `/patients?search=John&sort=age`
- `/billings?search=Pending&sort=amount`
- `/prescriptions?search=Aspirin&sort=status`

## Database Connection

Connected to: `mongodb://127.0.0.1:27017/medicalApp`

Ensure MongoDB is running locally before starting the server.

## Next Steps (for future enhancement)

Ready to add when you want:
- ✗ Add new records (patient creation form, prescription entry)
- ✗ Edit existing records (update forms for any model)
- ✗ Delete records (with confirmation dialogs)
- ✗ Advanced filtering (date ranges, custom queries)
- ✗ Export to CSV/PDF
- ✗ Dashboard with analytics charts
- ✗ User authentication & roles

## Commands

**Start the web server:**
```powershell
node server.js
```

**Seed the database (in another terminal):**
```powershell
node .\seed.js 100
```

**Stop the server:**
Press `Ctrl+C` in the terminal running the server

---

The app is fully functional for viewing, searching, and sorting! Ready to add CRUD operations next.
