// src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db/db");

const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Auth Backend Running");
});

app.get("/test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1");
    res.json({ message: "Database connected", rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
