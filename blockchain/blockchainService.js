// blockchainService.js
const { Web3 } = require('web3');
require('dotenv').config();

// Contract ABI (from compiled Solidity contract)
const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "address", "name": "admin", "type": "address"}
    ],
    "name": "AdminAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "address", "name": "inspector", "type": "address"}
    ],
    "name": "InspectorAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "string", "name": "serialCode", "type": "string"},
      {"indexed": false, "internalType": "address", "name": "createdBy", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "WaterPackCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "string", "name": "serialCode", "type": "string"},
      {"indexed": false, "internalType": "address", "name": "approvedBy", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "WaterPackApproved",
    "type": "event"
  },
  {
    "inputs": [{"internalType": "string", "name": "serialCode", "type": "string"}],
    "name": "createWaterPack",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "serialCode", "type": "string"}],
    "name": "moveToInspector",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "serialCode", "type": "string"}],
    "name": "approveWaterPack",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "serialCode", "type": "string"},
      {"internalType": "string", "name": "reason", "type": "string"}
    ],
    "name": "rejectWaterPack",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "serialCode", "type": "string"}],
    "name": "distributeWaterPack",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "serialCode", "type": "string"}],
    "name": "sellWaterPack",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "serialCode", "type": "string"}],
    "name": "verifyWaterPack",
    "outputs": [
      {"internalType": "string", "name": "serial", "type": "string"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "address", "name": "createdBy", "type": "address"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "lastModifiedAt", "type": "uint256"},
      {"internalType": "string", "name": "rejectionReason", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

class BlockchainService {
  constructor() {
    // Connect to blockchain network
    // For development: Use Ganache or Hardhat local network
    // For testnet: Use Sepolia, Goerli, etc.
    this.web3 = new Web3(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545');
    
    // Contract address (deploy your contract first and add address here)
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    
    // Admin wallet private key (NEVER commit this to git!)
    this.adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    
    if (this.contractAddress) {
      this.contract = new this.web3.eth.Contract(CONTRACT_ABI, this.contractAddress);
    }
  }

  async getAccount() {
    const account = this.web3.eth.accounts.privateKeyToAccount(this.adminPrivateKey);
    this.web3.eth.accounts.wallet.add(account);
    return account.address;
  }

  async createWaterPack(serialCode) {
    try {
      const account = await this.getAccount();
      
      const tx = await this.contract.methods.createWaterPack(serialCode).send({
        from: account,
        gas: 300000
      });

      return {
        success: true,
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        serialCode
      };
    } catch (error) {
      console.error('Blockchain error:', error);
      throw new Error(`Blockchain transaction failed: ${error.message}`);
    }
  }

  async moveToInspector(serialCode) {
    try {
      const account = await this.getAccount();
      
      const tx = await this.contract.methods.moveToInspector(serialCode).send({
        from: account,
        gas: 200000
      });

      return {
        success: true,
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber
      };
    } catch (error) {
      throw new Error(`Blockchain transaction failed: ${error.message}`);
    }
  }

  async approveWaterPack(serialCode) {
    try {
      const account = await this.getAccount();
      
      const tx = await this.contract.methods.approveWaterPack(serialCode).send({
        from: account,
        gas: 200000
      });

      return {
        success: true,
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Blockchain transaction failed: ${error.message}`);
    }
  }

  async rejectWaterPack(serialCode, reason) {
    try {
      const account = await this.getAccount();
      
      const tx = await this.contract.methods.rejectWaterPack(serialCode, reason).send({
        from: account,
        gas: 250000
      });

      return {
        success: true,
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber
      };
    } catch (error) {
      throw new Error(`Blockchain transaction failed: ${error.message}`);
    }
  }

  async distributeWaterPack(serialCode) {
    try {
      const account = await this.getAccount();
      
      const tx = await this.contract.methods.distributeWaterPack(serialCode).send({
        from: account,
        gas: 200000
      });

      return {
        success: true,
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber
      };
    } catch (error) {
      throw new Error(`Blockchain transaction failed: ${error.message}`);
    }
  }

  async sellWaterPack(serialCode) {
    try {
      const account = await this.getAccount();
      
      const tx = await this.contract.methods.sellWaterPack(serialCode).send({
        from: account,
        gas: 200000
      });

      return {
        success: true,
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber
      };
    } catch (error) {
      throw new Error(`Blockchain transaction failed: ${error.message}`);
    }
  }

  async verifyWaterPack(serialCode) {
    try {
      const result = await this.contract.methods.verifyWaterPack(serialCode).call();
      
      const statusMap = {
        0: 'CREATED',
        1: 'INSPECTOR',
        2: 'APPROVED',
        3: 'REJECTED_CONTAMINATED',
        4: 'REJECTED_EXPIRED',
        5: 'DISTRIBUTED',
        6: 'SOLD'
      };

      return {
        serialCode: result.serial,
        status: statusMap[result.status],
        createdBy: result.createdBy,
        createdAt: new Date(Number(result.createdAt) * 1000),
        lastModifiedAt: new Date(Number(result.lastModifiedAt) * 1000),
        rejectionReason: result.rejectionReason || null
      };
    } catch (error) {
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  async getTotalWaterPacks() {
    try {
      const total = await this.contract.methods.getTotalWaterPacks().call();
      return Number(total);
    } catch (error) {
      throw new Error(`Failed to get total: ${error.message}`);
    }
  }
}

module.exports = new BlockchainService();