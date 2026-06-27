const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying PredictionMarket (dynamic teams)");
  console.log("Network:", hre.network.name);

  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const market = await PredictionMarket.deploy();
  await market.waitForDeployment();

  const address = await market.getAddress();
  console.log("\n✅ PredictionMarket deployed to:", address);

  // Save deployed address + ABI for the server to consume
  const artifact = await hre.artifacts.readArtifact("PredictionMarket");
  const deployment = {
    address: address,
    abi: artifact.abi,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log("📄 Deployment info saved to:", outPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
