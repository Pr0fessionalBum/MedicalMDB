import express from 'express';
import mongoose from 'mongoose';
import Billing from '../models/Billing.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

// Protected route will be registered with isAuthenticated in server.js
router.get('/', async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - weeks * 7);

    // weekly billing trend
    const trend = await Billing.aggregate([
      { $match: { createdAt: { $gte: start }, isDeleted: false } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            week: { $isoWeek: '$createdAt' }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);

    // totals by status
    const totalsByStatus = await Billing.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalAmount: -1 } }
    ]);

    // top diagnoses
    const topDiagnoses = await Appointment.aggregate([
      { $unwind: '$diagnoses' },
      { $match: { 'diagnoses.code': { $exists: true, $ne: '' } } },
      { $group: { _id: { code: '$diagnoses.code', description: '$diagnoses.description' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Render HTML view when requested, else JSON
    if (req.accepts('html')) {
      return res.render('analytics', {
        trend,
        totalsByStatus,
        topDiagnoses,
        weeks,
        user: req.session?.physicianName,
        activePage: 'analytics'
      });
    }

    res.json({ trend, totalsByStatus, topDiagnoses });
  } catch (err) {
    console.error('ANALYTICS ERROR', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
