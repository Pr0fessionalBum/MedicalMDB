// /middleware/auth.js

export function isAuthenticated(req, res, next) {
  if (req.session && req.session.physicianId) {
    return next();
  }
  return res.redirect("/login");
}
