const sha256 = require("sha256");
const { v1: uuidv1 } = require("uuid");

class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.createNewBlock(100, "0", "0"); // genesis block
  }

  createNewBlock(nonce, previousBlockHash, hash) {
    const newBlock = {
      index: this.chain.length + 1,
      timestamp: Date.now(),
      transactions: this.pendingTransactions,
      nonce,
      hash,
      previousBlockHash,
    };

    this.pendingTransactions = [];
    this.chain.push(newBlock);
    return newBlock;
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  createNewTransaction(serial, action, performedBy) {
    return {
      serial,
      action,
      performedBy,
      transactionId: uuidv1().split("-").join(""),
    };
  }

  addTransactionToPendingTransactions(transactionObj) {
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock().index + 1;
  }

  hashBlock(previousBlockHash, currentBlockData, nonce) {
    const dataAsString =
      previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    return sha256(dataAsString);
  }

  proofOfWork(previousBlockHash, currentBlockData) {
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    while (hash.substring(0, 4) !== "0000") {
      nonce++;
      hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    }
    return nonce;
  }
}

module.exports = Blockchain;
