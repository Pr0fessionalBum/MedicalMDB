# Medical Database Web App - Complete Documentation

## 🔒 Authentication & Security

### Login System
- **Physician-based authentication** using Express sessions
- **Password hashing** with bcrypt (10 salt rounds)
- **Session management** with 24-hour expiration
- All CRUD operations require authentication

### Demo Credentials
```
Username: demo_doctor
Password: password123
```

### How to Create Additional Physicians
Use MongoDB to add physicians with authentication fields:
```javascript
const physician = {
  name: "Dr. John Smith",
  specialization: "Cardiology",
  username: "dr_john",
  passwordHash: "hashedPassword", // Will be hashed by pre-save hook
  isActive: true,
  contactInfo: { email: "john@hospital.com", phone: "+1 (555) 123-4567" },
  schedule: ["Mon 08:00-12:00", "Wed 09:00-13:00"]
}
```

## 🔄 CRUD Operations

### Create (POST)
- **Patients**: `/patients/create` → Form to add new patient
- **Prescriptions**: `/prescriptions/create` → Form to add new prescription
- **Appointments**: `/appointments/create` → Form to add appointment with diagnoses

Forms include:
- Client-side validation
- Dropdowns for patient/physician selection
- Dynamic diagnosis addition (for appointments)

### Read (GET)
- **All records viewable** with search and sort
- **Patient details page** shows:
  - Personal info (DOB, age, gender, contact)
  - Associated prescriptions
  - Associated appointments
  - Associated billing records

### Update (PUT)
- **Patients**: Click "Edit" button on patient row
- Edit patient demographics, contact info
- Updates reflect immediately

### Delete (Soft Delete - No Hard Deletion)
- **Records marked as deleted** instead of removed from DB
- Deleted records **hidden from view** by default
- **Audit trail preserved**: `deletedAt` and `deletedBy` fields track deletion
- **Safe for mass deletion**: References remain intact for data recovery

**Delete Process:**
1. User clicks "Delete" button
2. Confirmation dialog appears
3. Record marked `isDeleted: true`
4. `deletedAt` and `deletedBy` recorded
5. Record automatically filtered from queries

## 📋 Database Models

All models include soft-delete support:

### Patient
```javascript
{
  name: String,
  dob: Date,
  age: Number (auto-calculated),
  gender: String,
  contactInfo: { phone, email, address },
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId (Physician ref),
  timestamps: true
}
```

### Physician (with Authentication)
```javascript
{
  name: String,
  specialization: String,
  username: String (unique),
  passwordHash: String (hashed),
  isActive: Boolean,
  contactInfo: { phone, email },
  schedule: [String],
  timestamps: true
}
```

### Prescription
```javascript
{
  patientID: ObjectId (Patient ref),
  physicianID: ObjectId (Physician ref),
  medicationName: String,
  dosage: String,
  instructions: String,
  startDate: Date,
  endDate: Date,
  status: String (active|pending|completed|discontinued),
  frequency: String,
  type: String (Oral|Topical|Injectable|Inhalation),
  medicationCode: String,
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId,
  timestamps: true
}
```

### Appointment
```javascript
{
  patientID: ObjectId,
  physicianID: ObjectId,
  date: Date,
  notes: String,
  summary: String,
  diagnoses: [{
    code: String,
    description: String,
    chronic: Boolean,
    recordedAt: Date
  }],
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId,
  timestamps: true
}
```

### Billing
```javascript
{
  appointmentID: ObjectId,
  patientID: ObjectId,
  amount: Number,
  status: String (Paid|Pending|Due),
  paymentDate: Date,
  InsuranceProvider: String,
  policyNumber: String,
  coverageAmount: Number,
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId,
  timestamps: true
}
```

## 🗂️ File Structure

```
MedicalMDB/
├── server.js                    # Express app with all routes
├── setupDemo.js                 # Creates demo physician account
├── package.json                 # Dependencies (express, mongoose, bcrypt, express-session, ejs)
├── models/
│   ├── Patient.js              # With age auto-calculation
│   ├── Physician.js            # With password hashing
│   ├── Prescription.js         # With soft-delete
│   ├── Appointment.js          # With soft-delete
│   └── Billing.js              # With soft-delete
├── views/
│   ├── login.ejs               # Physician login (gradient design)
│   ├── index.ejs               # Home with dashboard
│   ├── patients.ejs            # Patient list + CRUD buttons
│   ├── patient-form.ejs        # Create/Edit patient form
│   ├── patient-detail.ejs      # Patient details with related data
│   ├── physicians.ejs          # Physician directory
│   ├── prescriptions.ejs       # Prescription list + CRUD
│   ├── prescription-form.ejs   # Create prescription form
│   ├── appointments.ejs        # Appointment list + CRUD
│   ├── appointment-form.ejs    # Create appointment with dynamic diagnoses
│   └── billings.ejs            # Billing records + CRUD
└── public/
    └── style.css               # Professional responsive styling
```

## 🌐 Routes

### Authentication
| Route | Method | Purpose |
|-------|--------|---------|
| `/login` | GET | Login page |
| `/login` | POST | Process login |
| `/logout` | GET | Logout & destroy session |

### Patients
| Route | Method | Purpose | Auth Required |
|-------|--------|---------|----------------|
| `/patients` | GET | List patients | ✓ |
| `/patients/create` | GET | Create form | ✓ |
| `/patients` | POST | Create patient | ✓ |
| `/patients/:id` | GET | Patient details | ✓ |
| `/patients/:id/edit` | GET | Edit form | ✓ |
| `/patients/:id/edit` | POST | Update patient | ✓ |
| `/patients/:id/delete` | POST | Soft-delete patient | ✓ |

### Prescriptions
| Route | Method | Purpose | Auth Required |
|-------|--------|---------|----------------|
| `/prescriptions` | GET | List prescriptions | ✓ |
| `/prescriptions/create` | GET | Create form | ✓ |
| `/prescriptions` | POST | Create prescription | ✓ |
| `/prescriptions/:id/delete` | POST | Soft-delete prescription | ✓ |

### Appointments
| Route | Method | Purpose | Auth Required |
|-------|--------|---------|----------------|
| `/appointments` | GET | List appointments | ✓ |
| `/appointments/create` | GET | Create form | ✓ |
| `/appointments` | POST | Create appointment | ✓ |
| `/appointments/:id/delete` | POST | Soft-delete appointment | ✓ |

### Billings
| Route | Method | Purpose | Auth Required |
|-------|--------|---------|----------------|
| `/billings` | GET | List billings | ✓ |
| `/billings/:id/delete` | POST | Soft-delete billing | ✓ |

### Physicians
| Route | Method | Purpose | Auth Required |
|-------|--------|---------|----------------|
| `/physicians` | GET | List physicians | ✓ |

## ✨ Key Features

### 1. **Authentication & Access Control**
- Physician login with session management
- Password hashing with bcrypt
- Automatic redirect to login if not authenticated
- User name displayed in navbar
- Logout button available

### 2. **Soft Delete Protection**
- Records **never actually deleted** from database
- Marked as `isDeleted: true` instead
- Maintains referential integrity (no orphaned foreign keys)
- Deletion audit trail (`deletedAt`, `deletedBy`)
- Safe for accidental mass deletions
- Can be recovered by admin if needed

### 3. **Search & Sort**
- Real-time search filtering
- Sort by multiple fields
- Case-insensitive search

### 4. **Professional UI**
- Responsive design (mobile/tablet/desktop)
- Clean navigation with active indicators
- Status badges (Paid, Pending, Due, Active)
- Modals for viewing large content (physician schedules, appointment notes)
- Form validation
- Confirmation dialogs for destructive actions

### 5. **Dynamic Forms**
- Patient creation/editing
- Prescription with medication selection
- Appointments with dynamic diagnosis addition/removal
- Date pickers, dropdowns, textareas

### 6. **Data Integrity**
- Foreign key references maintained even with soft-delete
- Automatic age calculation for patients
- Password hashing before storage
- Session timeouts after 24 hours

## 🚀 Getting Started

### 1. Install Dependencies
```powershell
npm install
```

### 2. Create Demo Physician
```powershell
node .\setupDemo.js
```

### 3. Start Server
```powershell
node server.js
```

### 4. Access Application
```
http://localhost:3000
```

### 5. Login
```
Username: demo_doctor
Password: password123
```

## 📊 Seed Database

Seed with sample data (in another terminal while server runs):
```powershell
node .\seed.js 50
```

This creates:
- 50 patients with realistic DOB, age, contact info
- Multiple prescriptions per patient
- Multiple appointments with diagnoses
- Billing records for appointments
- Physician availability schedules

## 🔐 Security Notes

- **Passwords**: Hashed with bcrypt (10 salt rounds)
- **Sessions**: 24-hour expiration
- **Deletion**: Soft-delete preserves data integrity
- **Validation**: Server-side and client-side form validation
- **Audit Trail**: All deletions tracked with `deletedBy` and `deletedAt`

## 🛠️ Customization

### Add New Authentication Fields
Edit `models/Physician.js` schema and `server.js` login logic

### Change Session Duration
Edit in `server.js`:
```javascript
cookie: { maxAge: 1000 * 60 * 60 * 24 } // milliseconds
```

### Modify Soft-Delete Behavior
All queries use `isDeleted: false` filter. To show deleted records:
```javascript
// Remove the isDeleted filter from queries
const query = {}; // instead of { isDeleted: false }
```

### Add More Diagnoses Options
Edit `templates.js` `diagnosisOptions` array and update appointment form

## 📝 API Response Examples

### Login Success
```javascript
// Session created with physicianId and physicianName
req.session.physicianId // ObjectId
req.session.physicianName // "Dr. John"
```

### Create Patient
```
POST /patients
Body: {
  name, dob, gender, phone, email, address
}
Response: Redirect to /patients
```

### Delete Patient (Soft)
```
POST /patients/:id/delete
Response: {
  isDeleted: true,
  deletedAt: Date,
  deletedBy: ObjectId (current physician)
}
```

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Status**: Production Ready ✅
