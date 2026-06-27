/**
 * Credit play-money balances to all demo wallets.
 * Run with: npx hardhat run scripts/credit-balances.js --network monadTestnet
 *
 * Reads demo-wallets.json and the deployed contract address from deployment.json,
 * then calls creditBalance(address, amount) for each wallet.
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  let wallets = [];
  if (process.env.DEMO_WALLETS_JSON) {
    wallets = JSON.parse(process.env.DEMO_WALLETS_JSON);
  } else {
    const walletsPath = path.join(__dirname, "..", "demo-wallets.json");
    if (!fs.existsSync(walletsPath)) {
      console.error("❌ demo-wallets.json not found. Run: npm run generate-wallets");
      process.exit(1);
    }
    wallets = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
  }

  let deployment;
  if (process.env.DEPLOYMENT) {
    deployment = JSON.parse(process.env.DEPLOYMENT);
  } else {
    const deploymentPath = path.join(__dirname, "..", "deployment.json");
    if (!fs.existsSync(deploymentPath)) {
      console.error("❌ deployment.json not found. Deploy the contract first: npm run deploy");
      process.exit(1);
    }
    deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }
  const balancePerWallet = 1000; // play-money tokens

  console.log(`Contract: ${deployment.address}`);
  console.log(`Crediting ${balancePerWallet} tokens to ${wallets.length} wallets...`);

  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const market = PredictionMarket.attach(deployment.address);

  for (let i = 0; i < wallets.length; i++) {
    const tx = await market.creditBalance(wallets[i].address, balancePerWallet);
    await tx.wait();
    console.log(`  ✅ #${i} ${wallets[i].address} — credited ${balancePerWallet} tokens`);
  }

  console.log(`\n✅ Credited ${wallets.length} wallets with ${balancePerWallet} tokens each.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
