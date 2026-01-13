const express = require("express");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db/db");
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

const router = express.Router();

/**
 * 1️⃣ Create water pack (admin only)
 */
router.post("/", auth, role("admin"), async (req, res) => {
  try {
    const serialCode = `WAT-${uuidv4()}`;

    await pool.query(
      `INSERT INTO water_packs (serial_code, status, created_by)
       VALUES (?, ?, ?)`,
      [serialCode, "CREATED", req.user.id]
    );

    res.status(201).json({
      message: "Water pack created",
      serialCode,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2️⃣ Move water pack to TESTING (tester only)
 */
router.patch("/:serial/test", auth, role("tester"), async (req, res) => {
  try {
    await pool.query(
      `UPDATE water_packs SET status = 'TESTING' WHERE serial_code = ?`,
      [req.params.serial]
    );

    res.json({ message: "Water pack moved to TESTING stage" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3️⃣ Approve water pack (admin only)
 */
router.patch("/:serial/approve", auth, role("admin"), async (req, res) => {
  try {
    await pool.query(
      `UPDATE water_packs SET status = 'APPROVED' WHERE serial_code = ?`,
      [req.params.serial]
    );

    res.json({ message: "Water pack approved for consumption" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4️⃣ Reject water pack (admin only)
 */
router.patch("/:serial/reject", auth, role("admin"), async (req, res) => {
  try {
    const { reason } = req.body; // e.g., "CONTAMINATED", "EXPIRED"
    const status = `REJECTED_${reason.toUpperCase()}`;

    await pool.query(
      `UPDATE water_packs SET status = ? WHERE serial_code = ?`,
      [status, req.params.serial]
    );

    res.json({ message: `Water pack rejected: ${reason}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5️⃣ Public verification endpoint
 */
router.get("/verify/:serial", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT serial_code, status, created_at FROM water_packs WHERE serial_code = ?",
      [req.params.serial]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Water pack not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
