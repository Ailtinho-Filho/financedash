const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findUserByEmail } = require("../store");

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email e senha são obrigatórios." });
  if (findUserByEmail(email)) return res.status(409).json({ error: "Usuário já existe." });

  const passwordHash = await bcrypt.hash(password, 10);
  createUser({ email, passwordHash });

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Credenciais inválidas." });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas." });

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

module.exports = router;
