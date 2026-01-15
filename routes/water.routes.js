const express = require("express");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db/db");
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const blockchainService = require("../blockchain/blockchainService");

const router = express.Router();

// Helper function to convert BigInt to string in objects
const convertBigIntsToStrings = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntsToStrings);
  }
  
  if (typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = convertBigIntsToStrings(obj[key]);
    }
    return newObj;
  }
  
  return obj;
};

/**
 * 1️⃣ Create water pack (ADMIN only)
 * Records on REAL Ethereum blockchain
 */
router.post("/", auth, role("ADMIN"), async (req, res) => {
  try {
    const serialCode = `WAT-${uuidv4()}`;

    // 1️⃣ Create on blockchain FIRST
    const blockchainResult = await blockchainService.createWaterPack(serialCode);

    // 2️⃣ Then save to database as backup
    await pool.query(
      `INSERT INTO water_packs (serial_code, status, created_by, blockchain_tx)
       VALUES (?, ?, ?, ?)`,
      [serialCode, "CREATED", req.user.id, blockchainResult.transactionHash]
    );

    res.status(201).json({
      message: "Water pack created on blockchain",
      serialCode,
      blockchain: convertBigIntsToStrings({
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber
      })
    });
  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2️⃣ Move water pack to INSPECTOR
 */
router.patch("/:serial/test", auth, async (req, res) => {
  try {
    if (req.user.role !== "inspector" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Record on blockchain
    const blockchainResult = await blockchainService.moveToInspector(req.params.serial);

    // Update database
    await pool.query(
      `UPDATE water_packs 
       SET status = 'INSPECTOR', blockchain_tx = ? 
       WHERE serial_code = ?`,
      [blockchainResult.transactionHash, req.params.serial]
    );

    res.json({ 
      message: "Water pack moved to INSPECTOR stage",
      blockchain: convertBigIntsToStrings({
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber
      })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3️⃣ Approve water pack (ADMIN only)
 */
router.patch("/:serial/approve", auth, role("ADMIN"), async (req, res) => {
  try {
    // Record on blockchain
    const blockchainResult = await blockchainService.approveWaterPack(req.params.serial);

    // Update database
    await pool.query(
      `UPDATE water_packs 
       SET status = 'APPROVED', blockchain_tx = ? 
       WHERE serial_code = ?`,
      [blockchainResult.transactionHash, req.params.serial]
    );

    res.json({
      message: "Water pack approved and recorded on blockchain",
      blockchain: convertBigIntsToStrings({
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        gasUsed: blockchainResult.gasUsed
      })
    });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4️⃣ Reject water pack (ADMIN only)
 */
router.patch("/:serial/reject", auth, role("ADMIN"), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!["CONTAMINATED", "EXPIRED"].includes(reason)) {
      return res.status(400).json({ error: "Invalid rejection reason" });
    }

    // Record on blockchain
    const blockchainResult = await blockchainService.rejectWaterPack(
      req.params.serial, 
      reason
    );

    // Update database
    const status = `REJECTED_${reason}`;
    await pool.query(
      `UPDATE water_packs 
       SET status = ?, blockchain_tx = ? 
       WHERE serial_code = ?`,
      [status, blockchainResult.transactionHash, req.params.serial]
    );

    res.json({
      message: `Water pack rejected: ${reason} (recorded on blockchain)`,
      blockchain: convertBigIntsToStrings({
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber
      })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Mark water pack as DISTRIBUTED
 */
router.patch("/:serial/distribute", auth, role("ADMIN"), async (req, res) => {
  try {
    // Record on blockchain
    const blockchainResult = await blockchainService.distributeWaterPack(req.params.serial);

    // Update database
    await pool.query(
      `UPDATE water_packs 
       SET status = 'DISTRIBUTED', blockchain_tx = ? 
       WHERE serial_code = ?`,
      [blockchainResult.transactionHash, req.params.serial]
    );

    res.json({
      message: `Water pack ${req.params.serial} marked as DISTRIBUTED`,
      blockchain: convertBigIntsToStrings({
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber
      })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Mark water pack as SOLD
 */
router.patch("/:serial/sell", auth, role("ADMIN"), async (req, res) => {
  try {
    // Record on blockchain
    const blockchainResult = await blockchainService.sellWaterPack(req.params.serial);

    // Update database
    await pool.query(
      `UPDATE water_packs 
       SET status = 'SOLD', blockchain_tx = ? 
       WHERE serial_code = ?`,
      [blockchainResult.transactionHash, req.params.serial]
    );

    res.json({ 
      message: `Water pack ${req.params.serial} marked as SOLD`,
      blockchain: convertBigIntsToStrings({
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber
      })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5️⃣ Public verification endpoint - FROM BLOCKCHAIN
 */
router.get("/verify/:serial", async (req, res) => {
  try {
    const result = await blockchainService.verifyWaterPack(req.params.serial);
    res.json(convertBigIntsToStrings(result));
  } catch (err) {
    res.status(404).json({ error: "Water pack not found on blockchain" });
  }
});

/**
 * Get blockchain statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const total = await blockchainService.getTotalWaterPacks();
    res.json({
      totalWaterPacks: convertBigIntsToStrings(total),
      blockchainNetwork: process.env.BLOCKCHAIN_NETWORK || "localhost"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;