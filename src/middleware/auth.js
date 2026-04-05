const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret_change_in_production";

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = {
  authenticate,
  JWT_SECRET,
};
