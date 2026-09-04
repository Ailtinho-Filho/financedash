const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findUserByEmail } = require("../../lib/kv");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email e senha são obrigatórios." });
  if (await findUserByEmail(email)) return res.status(409).json({ error: "Usuário já existe." });

  const passwordHash = await bcrypt.hash(password, 10);
  await createUser({ email, passwordHash });

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token });
};
