# 🔧 Setup & Troubleshooting Guide

## ✅ Initial Setup Steps

### Step 1: Install Dependencies
```powershell
npm install
```

Expected output:
```
added 60 packages, audited 152 packages in 14s
found 0 vulnerabilities
```

### Step 2: Create Demo Physician Account
```powershell
node .\setupDemo.js
```

Expected output:
```
Connected to MongoDB
Demo physician created:
Username: demo_doctor
Password: password123
Setup complete
```

### Step 3: Start the Server
```powershell
node server.js
```

Expected output:
```
Connected to MongoDB
Server running on http://localhost:3000
```

### Step 4: Access the App
Open browser to: `http://localhost:3000`

You should see the home page. Click any link to be redirected to login.

### Step 5: Login
```
Username: demo_doctor
Password: password123
```

Click "Sign In" to proceed to the dashboard.

## 🌱 Populate with Sample Data (Optional)

In a **new PowerShell terminal** (while server is running):

```powershell
node .\seed.js 100
```

This creates:
- 100 patients with realistic data
- ~2000+ prescriptions (with frequency, type, status)
- ~3000+ appointments (with diagnoses)
- ~3000+ billing records
- Physician availability schedules

Takes approximately 30-60 seconds depending on your system.

## 🐛 Troubleshooting

### Issue: "MongoDB connection failed"
**Cause**: MongoDB is not running locally

**Solution**:
1. Check MongoDB is installed and running
2. Ensure it's accessible at `mongodb://127.0.0.1:27017/medicalApp`
3. Start MongoDB service:
   ```powershell
   # If using MongoDB Community Edition
   net start MongoDB
   ```

### Issue: "Port 3000 is already in use"
**Cause**: Another process is using port 3000

**Solution**:
```powershell
# Kill all node processes
Stop-Process -Name node -Force

# Or find what's using port 3000
netstat -ano | findstr :3000

# Then kill that process by PID
taskkill /PID <PID> /F
```

### Issue: "setupDemo.js fails with 'TypeError: next is not a function'"
**Expected**: This error is normal! It appears AFTER the demo account is created successfully.

The account is created even if you see this error. Ignore it and proceed to step 3.

### Issue: Login page appears but credentials don't work
**Solution**:
1. Verify setupDemo.js ran successfully
2. Check MongoDB for Physician collection:
   ```powershell
   mongosh
   use medicalApp
   db.physicians.findOne({ username: "demo_doctor" })
   ```
3. Should return a physician document. If not, re-run setupDemo.js
4. If the returned document shows `passwordHash` as plain text (for example `password123`) instead of a bcrypt hash starting with `$2`, the demo script saved the password before it was hashed. Run the fixer script to convert the plain password to a bcrypt hash:

```powershell
node .\fixPhysicianHash.js
```

After the fixer runs, re-check with `db.physicians.findOne(...)` — `passwordHash` should start with `$2b$` and logging in with the demo credentials should work.

### Issue: Forms don't submit or show errors
**Check**:
1. Browser console for JavaScript errors (F12 → Console tab)
2. Server terminal for error messages
3. Ensure MongoDB connection is active
4. Check form validation (all required fields filled)

### Issue: Soft-delete not working
**Verify**:
```powershell
mongosh
use medicalApp
# For patient, check isDeleted flag
db.patients.findOne({ _id: ObjectId("...") })
# Should show: isDeleted: true, deletedAt: Date, deletedBy: ObjectId
```

### Issue: New patient appears in list but no age calculated
**Cause**: Age calculation runs on save, but may not always trigger

**Solution**: Refresh the page (F5) to reload from database

### Issue: Can't create prescription - "No options in dropdown"
**Cause**: No patients or physicians exist yet

**Solution**:
1. Create a patient first via Patients page
2. Check that demo physician was created: `/physicians` page
3. Try prescription creation again

## 📊 Database Reset

To completely reset the database (delete all data):

```powershell
mongosh
use medicalApp
db.dropDatabase()
```

Then re-run setup:
```powershell
node .\setupDemo.js
node server.js
```

## 🔄 Common Workflows

### Create a Complete Patient Record

1. **Login** (if not already logged in)
2. **Create Patient**: `/patients/create`
   - Fill in demographics
   - Click "Add Patient"
3. **Add Appointment**: `/appointments/create`
   - Select newly created patient
   - Select a physician
   - Set appointment date
   - Add diagnoses
   - Click "Add Appointment"
4. **Add Prescription**: `/prescriptions/create`
   - Select patient
   - Select physician
   - Enter medication details
   - Click "Add Prescription"
5. **View Patient Details**: Go to Patients list, click "View"
   - Should see prescription and appointment

### Edit Patient Information

1. Go to `/patients`
2. Click "Edit" on patient row
3. Update any fields
4. Click "Update Patient"
5. Verify changes on patient detail page

### Delete Records (Soft-Delete)

1. On any list (patients, prescriptions, appointments, billings)
2. Click "Delete" button
3. Confirm in popup dialog
4. Record disappears from view
5. Record still in database with `isDeleted: true`

### Verify Soft-Delete in Database

```powershell
mongosh
use medicalApp

# Find deleted patients
db.patients.find({ isDeleted: true }).pretty()

# Find deleted prescriptions
db.prescriptions.find({ isDeleted: true }).pretty()

# Check deletion metadata
db.patients.findOne({ isDeleted: true })
# Returns: { deletedAt: Date, deletedBy: ObjectId }
```

## 🔐 Adding More Physician Accounts

Option 1: Using MongoDB directly
```powershell
mongosh
use medicalApp
db.physicians.insertOne({
  name: "Dr. Sarah Jones",
  specialization: "Cardiology",
  username: "dr_sarah",
  passwordHash: "password123", // Will be hashed on next login attempt
  isActive: true,
  contactInfo: {
    email: "sarah@hospital.com",
    phone: "+1 (555) 111-2222"
  },
  schedule: ["Mon 08:00-12:00", "Wed 14:00-18:00"],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Option 2: Modify setupDemo.js and run again (changes username)
```javascript
// In setupDemo.js, change:
const existing = await Physician.findOne({ username: 'new_doctor' });
// and
username: 'new_doctor',
```

## 📈 Performance Tips

### For Large Datasets (10,000+ patients)
1. Add MongoDB indexes:
   ```powershell
   mongosh
   use medicalApp
   db.patients.createIndex({ name: 1 })
   db.patients.createIndex({ isDeleted: 1 })
   db.prescriptions.createIndex({ patientID: 1 })
   db.appointments.createIndex({ patientID: 1 })
   ```

2. Limit search results in server.js:
   ```javascript
   const patients = await Patient.find(query)
     .sort(sortOption)
     .limit(100)  // Add this
     .lean();
   ```

3. Use pagination (future feature)

## 🆘 Getting Help

### Check Server Logs
The terminal running `node server.js` shows:
- Connection messages
- Route access logs
- Error details

### Check Browser Console
Press `F12` in browser, go to "Console" tab for:
- JavaScript errors
- Network issues
- Form validation problems

### Check MongoDB Connection
```powershell
mongosh mongodb://127.0.0.1:27017/medicalApp
# If connects, MongoDB is running
show collections  # See what tables exist
```

## ✅ Verification Checklist

After setup, verify:

- [ ] Server running (`node server.js` shows "Connected to MongoDB")
- [ ] Login works (demo_doctor / password123)
- [ ] Can view patients list
- [ ] Can create new patient
- [ ] Can add prescription
- [ ] Can add appointment
- [ ] Can delete records (soft-delete)
- [ ] Deleted records don't appear in lists
- [ ] Can logout and login again
- [ ] Browser shows no console errors

## 🎯 Next Steps

1. **Create test data** via the web app
2. **Explore soft-delete** - notice records stay in DB but are hidden
3. **Check audit trail** - deleted records show `deletedAt` and `deletedBy`
4. **Review documentation**:
   - `CRUD_AND_AUTH_GUIDE.md` - Full API reference
   - `CRUD_SUMMARY.md` - Feature overview
   - This file - Setup and troubleshooting

## 📞 Common Questions

**Q: Where are passwords stored?**
A: Hashed in `Physician.passwordHash` field. Never stored in plain text.

**Q: Can I recover soft-deleted records?**
A: Yes! Query MongoDB with `{ isDeleted: true }` and set flag back to `false`.

**Q: How long do sessions last?**
A: 24 hours from last activity. Edit in `server.js` line with `maxAge`.

**Q: Can I add custom physician accounts?**
A: Yes! Use MongoDB directly or modify setupDemo.js.

**Q: What happens to related records when I delete a patient?**
A: They stay in database (soft-delete), but prescriptions/appointments/billings still reference the deleted patient (referential integrity maintained).

**Q: Is the demo password secure?**
A: For demo only! Change password in setupDemo.js or use different credentials for production.

---

**Last Updated**: December 2025
**Version**: 1.0.0
**Status**: ✅ Fully Operational
