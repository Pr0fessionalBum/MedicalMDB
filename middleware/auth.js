// /middleware/auth.js

export function isAuthenticated(req, res, next) {
  if (req.session && (req.session.physicianId || req.session.guestPatientId)) {
    return next();
  }
  return res.redirect("/login");
}
