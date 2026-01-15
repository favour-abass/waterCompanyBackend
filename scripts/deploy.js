const hre = require("hardhat");

async function main() {
  console.log("Deploying WaterPackTracker contract...");

  // Get the contract factory
  const WaterPackTracker = await hre.ethers.getContractFactory("WaterPackTracker");
  
  // Deploy the contract
  const waterPackTracker = await WaterPackTracker.deploy();

  // Wait for deployment to complete (works with both ethers v5 and v6)
  await waterPackTracker.deployed();

  console.log("✅ WaterPackTracker deployed to:", waterPackTracker.address);
  console.log("📝 Save this address to your .env file as CONTRACT_ADDRESS");
  
  // Get deployer info
  const [deployer] = await hre.ethers.getSigners();
  console.log("🔑 Deployed by:", deployer.address);
  
  // Get deployment transaction
  console.log("📋 Deployment transaction:", waterPackTracker.deployTransaction.hash);

  // Save to a file for easy reference
  const fs = require("fs");
  const deploymentInfo = {
    contractAddress: waterPackTracker.address,
    deployer: deployer.address,
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    transactionHash: waterPackTracker.deployTransaction.hash
  };

  fs.writeFileSync(
    "./deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✨ Deployment info saved to deployment-info.json");
  console.log("\n🚀 Next steps:");
  console.log("1. Add CONTRACT_ADDRESS to your .env file:");
  console.log(`   CONTRACT_ADDRESS=${waterPackTracker.address}`);
  console.log("2. Start your backend server: npm start");
  console.log("3. Test the blockchain integration!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });