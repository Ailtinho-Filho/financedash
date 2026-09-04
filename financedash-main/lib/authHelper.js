const jwt = require("jsonwebtoken");

function requireAuth(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Token ausente." });
    return null;
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET); // { email }
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado." });
    return null;
  }
}

module.exports = { requireAuth };
