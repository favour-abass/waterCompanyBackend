const express = require("express");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db/db");
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const waterBlockchain = require("../blockchain/blockchainInstance");

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
router.patch("/:serial/test", auth, async (req, res) => {
  try {
    // Only allow admin or tester
    if (req.user.role !== "tester" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

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

    // 1️⃣ Create blockchain transaction
    const transaction = waterBlockchain.createNewTransaction(
      req.params.serial,
      "APPROVED",
      req.user.role
    );

    waterBlockchain.addTransactionToPendingTransactions(transaction);

    // 2️⃣ Mine block
    const lastBlock = waterBlockchain.getLastBlock();
    const previousBlockHash = lastBlock.hash;
    const currentBlockData = {
      transactions: waterBlockchain.pendingTransactions,
      index: lastBlock.index + 1,
    };

    const nonce = waterBlockchain.proofOfWork(
      previousBlockHash,
      currentBlockData
    );
    const hash = waterBlockchain.hashBlock(
      previousBlockHash,
      currentBlockData,
      nonce
    );

    const newBlock = waterBlockchain.createNewBlock(
      nonce,
      previousBlockHash,
      hash
    );

    res.json({
      message: "Water approved and recorded on blockchain",
      block: newBlock,
    });
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

    // 1️⃣ Update database
    await pool.query(
      `UPDATE water_packs SET status = ? WHERE serial_code = ?`,
      [status, req.params.serial]
    );

    // 2️⃣ Record on blockchain
    const transaction = waterBlockchain.createNewTransaction(
      req.params.serial,
      status,
      req.user.role
    );
    waterBlockchain.addTransactionToPendingTransactions(transaction);

    // 3️⃣ Mine block
    const lastBlock = waterBlockchain.getLastBlock();
    const previousBlockHash = lastBlock.hash;
    const currentBlockData = {
      transactions: waterBlockchain.pendingTransactions,
      index: lastBlock.index + 1,
    };

    const nonce = waterBlockchain.proofOfWork(
      previousBlockHash,
      currentBlockData
    );
    const hash = waterBlockchain.hashBlock(
      previousBlockHash,
      currentBlockData,
      nonce
    );

    const newBlock = waterBlockchain.createNewBlock(
      nonce,
      previousBlockHash,
      hash
    );

    res.json({
      message: `Water pack rejected: ${reason} (recorded on blockchain)`,
      block: newBlock,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Mark water pack as DISTRIBUTED
 */
router.patch(
  "/:serial/distribute",
  auth,
  role("ADMIN"),
  async (req, res) => {
    try {
      await pool.query(
        `UPDATE water_packs SET status = 'DISTRIBUTED' WHERE serial_code = ?`,
        [req.params.serial]
      );

      // Optionally record on blockchain
      const transaction = waterBlockchain.createNewTransaction(
        req.params.serial,
        "DISTRIBUTED",
        req.user.role
      );
      waterBlockchain.addTransactionToPendingTransactions(transaction);

      res.json({
        message: `Water pack ${req.params.serial} marked as DISTRIBUTED`,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * Mark water pack as SOLD
 */
router.patch("/:serial/sell", auth, role("ADMIN"), async (req, res) => {
  try {
    await pool.query(
      `UPDATE water_packs SET status = 'SOLD' WHERE serial_code = ?`,
      [req.params.serial]
    );

    // Optionally record on blockchain
    const transaction = waterBlockchain.createNewTransaction(
      req.params.serial,
      "SOLD",
      req.user.role
    );
    waterBlockchain.addTransactionToPendingTransactions(transaction);

    res.json({ message: `Water pack ${req.params.serial} marked as SOLD` });
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

router.get("/verify/:serial/blockchain", async (req, res) => {
  try {
    const serial = req.params.serial;

    // Search blockchain starting from the last block (latest first)
    let found = null;
    for (let i = waterBlockchain.chain.length - 1; i >= 0; i--) {
      const block = waterBlockchain.chain[i];
      const tx = block.transactions.find((t) => t.sender === serial);
      if (tx) {
        found = {
          serial,
          status: tx.amount, // in your implementation, amount = status
          recordedBy: tx.recipient, // user role
          blockIndex: block.index,
          timestamp: block.timestamp,
        };
        break;
      }
    }

    if (!found) {
      return res
        .status(404)
        .json({ error: "Water pack not found on blockchain" });
    }

    res.json(found);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
