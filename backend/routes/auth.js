const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email y password son requeridos." });
  }
  const existing = db.prepare("SELECT id FROM owners WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO owners (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name, email, password_hash);

  const token = jwt.sign({ id: info.lastInsertRowid, email }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.status(201).json({ token, owner: { id: info.lastInsertRowid, name, email } });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email y password son requeridos." });
  }
  const owner = db.prepare("SELECT * FROM owners WHERE email = ?").get(email);
  if (!owner || !bcrypt.compareSync(password, owner.password_hash)) {
    return res.status(401).json({ error: "Credenciales inválidas." });
  }
  const token = jwt.sign({ id: owner.id, email: owner.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token, owner: { id: owner.id, name: owner.name, email: owner.email } });
});

module.exports = router;
