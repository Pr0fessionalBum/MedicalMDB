import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import Patient from './models/Patient.js';
import Physician from './models/Physician.js';
import Prescription from './models/Prescription.js';
import Appointment from './models/Appointment.js';
import Billing from './models/Billing.js';

const app = express();
const PORT = 3000;
const MONGO = 'mongodb://127.0.0.1:27017/medicalApp';

// Middleware
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'medical-db-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGO, { dbName: 'medicalApp' });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  }
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.physicianId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// HOME AND AUTH ROUTES
app.get('/', (req, res) => {
  res.render('index', { user: req.session.physicianId ? true : false });
});

// Login page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login POST
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const physician = await Physician.findOne({ username });

    if (!physician) {
      return res.render('login', { error: 'Invalid username or password' });
    }

    const isValid = await physician.verifyPassword(password);
    if (!isValid) {
      return res.render('login', { error: 'Invalid username or password' });
    }

    req.session.physicianId = physician._id;
    req.session.physicianName = physician.name;
    res.redirect('/patients');
  } catch (err) {
    res.render('login', { error: 'Login failed: ' + err.message });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// SMART SEARCH API ROUTES
// Global search across patients, physicians, prescriptions
app.get('/api/search', isAuthenticated, async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchRegex = { $regex: q, $options: 'i' };
    
    // Search across multiple collections
    const [patients, physicians, prescriptions] = await Promise.all([
      Patient.find({ isDeleted: false, name: searchRegex }).select('_id name contactInfo').limit(limit / 3),
      Physician.find({ isActive: true, name: searchRegex }).select('_id name specialization').limit(limit / 3),
      Prescription.find({ isDeleted: false, medicationName: searchRegex }).select('_id medicationName patientID').limit(limit / 3)
    ]);

    const results = [
      ...patients.map(p => ({ type: 'patient', id: p._id, label: `Patient: ${p.name}`, name: p.name })),
      ...physicians.map(p => ({ type: 'physician', id: p._id, label: `Dr. ${p.name} (${p.specialization})`, name: p.name })),
      ...prescriptions.map(p => ({ type: 'prescription', id: p._id, label: `Rx: ${p.medicationName}`, name: p.medicationName }))
    ];

    res.json(results.slice(0, parseInt(limit)));
  } catch (err) {
    console.error('Search failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// PATIENTS ROUTES
app.get('/patients', isAuthenticated, async (req, res) => {
  try {
    const { search = '', sort = 'name', gender = '', ageMin = '', ageMax = '', page = 1, limit = 10, ajax = '' } = req.query;
    const query = { isDeleted: false };
    // Multi-field search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { 'contactInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }
    if (gender) query.gender = gender;
    if (ageMin) query.age = { ...query.age, $gte: parseInt(ageMin) };
    if (ageMax) query.age = { ...query.age, $lte: parseInt(ageMax) };
    const sortOption = sort === 'name' ? { name: 1 } : sort === 'dob' ? { dob: -1 } : { age: -1 };
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * pageSize;
    const totalCount = await Patient.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);
    const patients = await Patient.find(query).sort(sortOption).skip(skip).limit(pageSize).lean();
    // Helper for pagination query string
    function paginationQuery(p) {
      const params = { ...req.query, page: p };
      return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    }
    if (ajax) {
      // Render table rows and pagination as HTML snippets
      const rowsHtml = patients.map(patient => `
        <tr>
          <td><strong>${patient.name}</strong></td>
          <td>${new Date(patient.dob).toLocaleDateString()}</td>
          <td>${patient.age}</td>
          <td>${patient.gender}</td>
          <td>${patient.contactInfo?.email || 'N/A'}</td>
          <td>${patient.contactInfo?.phone || 'N/A'}</td>
          <td>
            <a href="/patients/${patient._id}" class="btn btn-small">View</a>
            <a href="/patients/${patient._id}/edit" class="btn btn-small">Edit</a>
            <form method="POST" action="/patients/${patient._id}/delete" style="display:inline; margin: 0;">
              <button type="submit" class="btn btn-small" style="background-color: #dc2626;" onclick="return confirm('Are you sure? This soft-deletes the patient.')">Delete</button>
            </form>
          </td>
        </tr>
      `).join('');
      let paginationHtml = '';
      if (totalPages > 1) {
        paginationHtml = `<nav class="pagination-nav">` +
          Array.from({ length: totalPages }, (_, i) => {
            const p = i + 1;
            return `<a href="/patients?${paginationQuery(p)}" class="pagination-link${p === pageNum ? ' active' : ''}">${p}</a>`;
          }).join('') + '</nav>';
      }
      return res.json({ rowsHtml, count: patients.length, totalCount, paginationHtml });
    }
    // Improved pagination logic: 5 numbers, last page, custom input
    function renderPagination(current, total) {
      let html = '<nav class="pagination-nav">';
      let start = Math.max(1, current - 2);
      let end = Math.min(total, start + 4);
      if (end - start < 4) start = Math.max(1, end - 4);
      if (start > 1) html += `<a href="/patients?${paginationQuery(1)}" class="pagination-link">1</a>`;
      for (let p = start; p <= end; p++) {
        html += `<a href="/patients?${paginationQuery(p)}" class="pagination-link${p === current ? ' active' : ''}">${p}</a>`;
      }
      if (end < total) html += `<a href="/patients?${paginationQuery(total)}" class="pagination-link">Last</a>`;
      html += `<input type="number" min="1" max="${total}" value="${current}" class="pagination-input" style="width:40px; font-size:12px; margin-left:8px;" onchange="window.location.href='/patients?${paginationQuery('')}&page='+this.value">`;
      html += '</nav>';
      return html;
    }
    res.render('patients', {
      patients,
      search,
      sort,
      gender,
      ageMin,
      ageMax,
      page: pageNum,
      limit: pageSize,
      totalPages,
      totalCount,
      paginationQuery,
      renderPagination,
      user: req.session.physicianName
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching patients');
  }
});

app.get('/patients/:id', isAuthenticated, async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!patient) return res.status(404).send('Patient not found');
    
    const prescriptions = await Prescription.find({ patientID: patient._id, isDeleted: false }).lean();
    const appointments = await Appointment.find({ patientID: patient._id, isDeleted: false }).lean();
    const billings = await Billing.find({ patientID: patient._id, isDeleted: false }).lean();
    
    res.render('patient-detail', { patient, prescriptions, appointments, billings, user: req.session.physicianName });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching patient detail');
  }
});

// Create patient form
app.get('/patients/create', isAuthenticated, async (req, res) => {
  res.render('patient-form', { patient: null, user: req.session.physicianName });
});

// Create patient POST
app.post('/patients', isAuthenticated, async (req, res) => {
  try {
    const { name, dob, gender, phone, email, address } = req.body;
    const patient = new Patient({
      name,
      dob: new Date(dob),
      gender,
      contactInfo: { phone, email, address }
    });
    await patient.save();
    res.redirect('/patients');
  } catch (err) {
    console.error(err);
    res.status(400).send('Error creating patient: ' + err.message);
  }
});

// Edit patient form
app.get('/patients/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!patient) return res.status(404).send('Patient not found');
    res.render('patient-form', { patient, user: req.session.physicianName });
  } catch (err) {
    res.status(500).send('Error fetching patient');
  }
});

// Update patient POST
app.post('/patients/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const { name, dob, gender, phone, email, address } = req.body;
    await Patient.findByIdAndUpdate(req.params.id, {
      name,
      dob: new Date(dob),
      gender,
      contactInfo: { phone, email, address }
    });
    res.redirect(`/patients/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(400).send('Error updating patient: ' + err.message);
  }
});

// Delete patient (soft delete - remove references)
app.post('/patients/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const patientId = req.params.id;
    await Patient.findByIdAndUpdate(patientId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.session.physicianId
    });
    res.redirect('/patients');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting patient: ' + err.message);
  }
});

// PHYSICIANS ROUTES
app.get('/physicians', isAuthenticated, async (req, res) => {
  try {
    const { search = '', sort = 'name', specialization = '', page = 1, limit = 10, ajax = '' } = req.query;
    const query = { isActive: true };
    // Multi-field search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { 'contactInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }
    if (specialization) query.specialization = specialization;
    const sortOption = sort === 'name' ? { name: 1 } : { specialization: 1 };
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * pageSize;
    const totalCount = await Physician.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);
    const physicians = await Physician.find(query).sort(sortOption).skip(skip).limit(pageSize).lean();
    // Get all specializations for filter dropdown
    const allSpecs = await Physician.distinct('specialization', { isActive: true });
    // Helper for pagination query string
    function paginationQuery(p) {
      const params = { ...req.query, page: p };
      return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    }
    // Improved pagination logic: 5 numbers, last page, custom input
    function renderPagination(current, total) {
      let html = '<nav class="pagination-nav">';
      let start = Math.max(1, current - 2);
      let end = Math.min(total, start + 4);
      if (end - start < 4) start = Math.max(1, end - 4);
      if (start > 1) html += `<a href="/physicians?${paginationQuery(1)}" class="pagination-link">1</a>`;
      for (let p = start; p <= end; p++) {
        html += `<a href="/physicians?${paginationQuery(p)}" class="pagination-link${p === current ? ' active' : ''}">${p}</a>`;
      }
      if (end < total) html += `<a href="/physicians?${paginationQuery(total)}" class="pagination-link">Last</a>`;
      html += `<input type="number" min="1" max="${total}" value="${current}" class="pagination-input" style="width:40px; font-size:12px; margin-left:8px;" onchange="window.location.href='/physicians?${paginationQuery('')}&page='+this.value">`;
      html += '</nav>';
      return html;
    }
    if (ajax) {
      const rowsHtml = physicians.map(physician => `
        <tr>
          <td><strong>${physician.name}</strong></td>
          <td>${physician.specialization}</td>
          <td>${physician.contactInfo?.email || 'N/A'}</td>
          <td>${physician.contactInfo?.phone || 'N/A'}</td>
          <td>
            <button class="btn btn-small" onclick="showSchedule(event)">View Schedule</button>
            <input type="hidden" class="schedule-data" value="${physician.name}" data-schedule="${JSON.stringify(physician.schedule || []).replace(/"/g, '&quot;')}">
          </td>
        </tr>
      `).join('');
  let paginationHtml = renderPagination(pageNum, totalPages);
  // Only return paginationHtml, not per-page dropdown, to avoid duplication
  return res.json({ rowsHtml, count: physicians.length, totalCount, paginationHtml });
    }
    res.render('physicians', {
  physicians,
  search,
  sort,
  specialization,
  allSpecs,
  page: pageNum,
  limit: pageSize,
  totalPages,
  totalCount,
  paginationQuery,
  renderPagination,
  user: req.session.physicianName
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching physicians');
  }
});

// PRESCRIPTIONS ROUTES
app.get('/prescriptions', isAuthenticated, async (req, res) => {
  try {
    const { search = '', sort = 'medicationName', status = '', type = '', page = 1, limit = 10, ajax = '' } = req.query;
    const query = { isDeleted: false };
    // Multi-field search
    if (search) {
      query.$or = [
        { medicationName: { $regex: search, $options: 'i' } },
        { dosage: { $regex: search, $options: 'i' } },
        { instructions: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (type) query.type = type;
    const sortOption = sort === 'medicationName' ? { medicationName: 1 } : sort === 'status' ? { status: 1 } : { startDate: -1 };
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * pageSize;
    const totalCount = await Prescription.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);
    const prescriptions = await Prescription.find(query).sort(sortOption).skip(skip).limit(pageSize).populate('patientID', 'name').lean();
    // Helper for pagination query string
    function paginationQuery(p) {
      const params = { ...req.query, page: p };
      return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    }
    // Improved pagination logic: 5 numbers, last page, custom input, per-page dropdown at bottom
    function renderPagination(current, total) {
      let html = '<nav class="pagination-nav">';
      let start = Math.max(1, current - 2);
      let end = Math.min(total, start + 4);
      if (end - start < 4) start = Math.max(1, end - 4);
      if (start > 1) html += `<a href="/prescriptions?${paginationQuery(1)}" class="pagination-link">1</a>`;
      for (let p = start; p <= end; p++) {
        html += `<a href="/prescriptions?${paginationQuery(p)}" class="pagination-link${p === current ? ' active' : ''}">${p}</a>`;
      }
      if (end < total) html += `<a href="/prescriptions?${paginationQuery(total)}" class="pagination-link">Last</a>`;
      html += `<input type="number" min="1" max="${total}" value="${current}" class="pagination-input" style="width:40px; font-size:12px; margin-left:8px;" onchange="window.location.href='/prescriptions?${paginationQuery('')}&page='+this.value">`;
      html += '</nav>';
      html += `<div class="perpage-controls" style="margin-top:8px; text-align:right; font-size:12px;">
        <label for="page-size" style="margin-right:4px;">Per page:</label>
        <select id="page-size" name="limit" style="font-size:12px; padding:2px 6px;" onchange="window.location.href='/prescriptions?${paginationQuery(current)}&limit='+this.value">
          <option value="10"${pageSize==10?' selected':''}>10</option>
          <option value="25"${pageSize==25?' selected':''}>25</option>
          <option value="50"${pageSize==50?' selected':''}>50</option>
          <option value="100"${pageSize==100?' selected':''}>100</option>
        </select>
      </div>`;
      return html;
    }
    if (ajax) {
      const rowsHtml = prescriptions.map(rx => `
        <tr>
          <td><a href="/patients/${rx.patientID._id}">${rx.patientID.name}</a></td>
          <td><strong>${rx.medicationName}</strong></td>
          <td>${rx.dosage}</td>
          <td>${rx.frequency || 'N/A'}</td>
          <td>${rx.type || 'N/A'}</td>
          <td><span class="badge badge-${rx.status}">${rx.status}</span></td>
          <td>${rx.startDate ? new Date(rx.startDate).toLocaleDateString() : ''}</td>
          <td>
            <form method="POST" action="/prescriptions/${rx._id}/delete" style="display:inline; margin: 0;">
              <button type="submit" class="btn btn-small" style="background-color: #dc2626; font-size: 11px;" onclick="return confirm('Delete this prescription?')">Delete</button>
            </form>
          </td>
        </tr>
      `).join('');
      let paginationHtml = renderPagination(pageNum, totalPages);
      return res.json({ rowsHtml, count: prescriptions.length, totalCount, paginationHtml });
    }
    // Improved pagination logic: 5 numbers, last page, custom input
    function renderPagination(current, total) {
      let html = '<nav class="pagination-nav">';
      let start = Math.max(1, current - 2);
      let end = Math.min(total, start + 4);
      if (end - start < 4) start = Math.max(1, end - 4);
      if (start > 1) html += `<a href="/prescriptions?${paginationQuery(1)}" class="pagination-link">1</a>`;
      for (let p = start; p <= end; p++) {
        html += `<a href="/prescriptions?${paginationQuery(p)}" class="pagination-link${p === current ? ' active' : ''}">${p}</a>`;
      }
      if (end < total) html += `<a href="/prescriptions?${paginationQuery(total)}" class="pagination-link">Last</a>`;
      html += `<input type="number" min="1" max="${total}" value="${current}" class="pagination-input" style="width:40px; font-size:12px; margin-left:8px;" onchange="window.location.href='/prescriptions?${paginationQuery('')}&page='+this.value">`;
      html += '</nav>';
      return html;
    }
    res.render('prescriptions', {
      prescriptions,
      search,
      sort,
      status,
      type,
      page: pageNum,
      limit: pageSize,
      totalPages,
      totalCount,
      paginationQuery,
      renderPagination,
      user: req.session.physicianName
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching prescriptions');
  }
});

// Create prescription form
app.get('/prescriptions/create', isAuthenticated, async (req, res) => {
  try {
    const patients = await Patient.find({ isDeleted: false }).select('name').lean();
    const physicians = await Physician.find({ isActive: true }).select('name').lean();
    res.render('prescription-form', { prescription: null, patients, physicians, user: req.session.physicianName });
  } catch (err) {
    res.status(500).send('Error loading form: ' + err.message);
  }
});

// Create prescription POST
app.post('/prescriptions', isAuthenticated, async (req, res) => {
  try {
    const { patientID, physicianID, medicationName, dosage, instructions, startDate, frequency, type, status } = req.body;
    const prescription = new Prescription({
      patientID,
      physicianID,
      medicationName,
      dosage,
      instructions,
      startDate: new Date(startDate),
      frequency,
      type,
      status
    });
    await prescription.save();
    res.redirect('/prescriptions');
  } catch (err) {
    console.error(err);
    res.status(400).send('Error creating prescription: ' + err.message);
  }
});

// Delete prescription (soft delete)
app.post('/prescriptions/:id/delete', isAuthenticated, async (req, res) => {
  try {
    await Prescription.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.session.physicianId
    });
    res.redirect('/prescriptions');
  } catch (err) {
    res.status(500).send('Error deleting prescription: ' + err.message);
  }
});

// APPOINTMENTS ROUTES
app.get('/appointments', isAuthenticated, async (req, res) => {
  try {
    const { search = '', sort = 'date' } = req.query;
    const query = { isDeleted: false };
    if (search) {
      query.summary = { $regex: search, $options: 'i' };
    }
    const sortOption = sort === 'date' ? { date: -1 } : sort === 'patient' ? { patientID: 1 } : { date: -1 };
    
    const appointments = await Appointment.find(query).sort(sortOption).populate('patientID', 'name').lean();
    // Improved pagination logic: 5 numbers, last page, custom input
    function paginationQuery(p) {
      const params = { ...req.query, page: p };
      return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    }
    function renderPagination(current, total) {
      let html = '<nav class="pagination-nav">';
      let start = Math.max(1, current - 2);
      let end = Math.min(total, start + 4);
      if (end - start < 4) start = Math.max(1, end - 4);
      if (start > 1) html += `<a href="/appointments?${paginationQuery(1)}" class="pagination-link">1</a>`;
      for (let p = start; p <= end; p++) {
        html += `<a href="/appointments?${paginationQuery(p)}" class="pagination-link${p === current ? ' active' : ''}">${p}</a>`;
      }
      if (end < total) html += `<a href="/appointments?${paginationQuery(total)}" class="pagination-link">Last</a>`;
      html += `<input type="number" min="1" max="${total}" value="${current}" class="pagination-input" style="width:40px; font-size:12px; margin-left:8px;" onchange="window.location.href='/appointments?${paginationQuery('')}&page='+this.value">`;
      html += '</nav>';
      return html;
    }
    res.render('appointments', { appointments, search, sort, page, limit, totalPages, totalCount, paginationQuery, renderPagination, user: req.session.physicianName });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching appointments');
  }
});

// Create appointment form
app.get('/appointments/create', isAuthenticated, async (req, res) => {
  try {
    const patients = await Patient.find({ isDeleted: false }).select('name').lean();
    const physicians = await Physician.find({ isActive: true }).select('name').lean();
    res.render('appointment-form', { appointment: null, patients, physicians, user: req.session.physicianName });
  } catch (err) {
    res.status(500).send('Error loading form: ' + err.message);
  }
});

// Create appointment POST
app.post('/appointments', isAuthenticated, async (req, res) => {
  try {
    const { patientID, physicianID, date, notes, summary, diagnoses } = req.body;
    const diagnosesArray = diagnoses ? JSON.parse(diagnoses) : [];
    
    const appointment = new Appointment({
      patientID,
      physicianID,
      date: new Date(date),
      notes,
      summary,
      diagnoses: diagnosesArray
    });
    await appointment.save();
    res.redirect('/appointments');
  } catch (err) {
    console.error(err);
    res.status(400).send('Error creating appointment: ' + err.message);
  }
});

// Delete appointment (soft delete)
app.post('/appointments/:id/delete', isAuthenticated, async (req, res) => {
  try {
    await Appointment.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.session.physicianId
    });
    res.redirect('/appointments');
  } catch (err) {
    res.status(500).send('Error deleting appointment: ' + err.message);
  }
});

// BILLINGS ROUTES
app.get('/billings', isAuthenticated, async (req, res) => {
  try {
    const { search = '', sort = 'status' } = req.query;
    const query = { isDeleted: false };
    if (search) {
      query.status = { $regex: search, $options: 'i' };
    }
    const sortOption = sort === 'status' ? { status: 1 } : sort === 'amount' ? { amount: -1 } : { createdAt: -1 };
    
    const billings = await Billing.find(query).sort(sortOption).populate('patientID', 'name').lean();

    // compute totals: overall, paid, due, pending
    const totals = billings.reduce((acc, b) => {
      const amt = Number(b.amount) || 0;
      acc.totalAmount += amt;
      if (b.status === 'Paid') acc.totalPaid += amt;
      else if (b.status === 'Due') acc.totalDue += amt;
      else if (b.status === 'Pending') acc.totalPending += amt;
      return acc;
    }, { totalAmount: 0, totalPaid: 0, totalDue: 0, totalPending: 0 });

    // Improved pagination logic: 5 numbers, last page, custom input
    function paginationQuery(p) {
      const params = { ...req.query, page: p };
      return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    }
    function renderPagination(current, total) {
      let html = '<nav class="pagination-nav">';
      let start = Math.max(1, current - 2);
      let end = Math.min(total, start + 4);
      if (end - start < 4) start = Math.max(1, end - 4);
      if (start > 1) html += `<a href="/billings?${paginationQuery(1)}" class="pagination-link">1</a>`;
      for (let p = start; p <= end; p++) {
        html += `<a href="/billings?${paginationQuery(p)}" class="pagination-link${p === current ? ' active' : ''}">${p}</a>`;
      }
      if (end < total) html += `<a href="/billings?${paginationQuery(total)}" class="pagination-link">Last</a>`;
      html += `<input type="number" min="1" max="${total}" value="${current}" class="pagination-input" style="width:40px; font-size:12px; margin-left:8px;" onchange="window.location.href='/billings?${paginationQuery('')}&page='+this.value">`;
      html += '</nav>';
      return html;
    }
    res.render('billings', { billings, search, sort, page, limit, totalPages, totalCount, paginationQuery, renderPagination, user: req.session.physicianName, totals });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching billings');
  }
});

// Delete billing (soft delete)
app.post('/billings/:id/delete', isAuthenticated, async (req, res) => {
  try {
    await Billing.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.session.physicianId
    });
    res.redirect('/billings');
  } catch (err) {
    res.status(500).send('Error deleting billing: ' + err.message);
  }
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
