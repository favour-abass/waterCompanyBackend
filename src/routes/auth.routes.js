const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db/db");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (uuid, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), name, email, passwordHash, role]
    );

    res.status(201).json({
      message: "Registration successful. Await admin approval."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const jwt = require("jsonwebtoken");

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.approved) {
      return res.status(403).json({ error: "Account not approved yet" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
