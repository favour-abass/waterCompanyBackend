require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db/db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Auth Backend Running");
});

app.get("/test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1");
    res.json({ message: "Database connected", rows });
  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).json({ error: err?.message || err || "Unknown error" });
  }
});

module.exports = app;
