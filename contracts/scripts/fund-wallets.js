/**
 * Fund all demo wallets with testnet MON for gas.
 * Run with: npx hardhat run scripts/fund-wallets.js --network monadTestnet
 *
 * The deployer wallet (from .env DEPLOYER_PRIVATE_KEY) sends a small amount
 * of MON to each demo wallet so they can pay gas for placeBet transactions.
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const walletsPath = path.join(__dirname, "..", "demo-wallets.json");
  if (!fs.existsSync(walletsPath)) {
    console.error("❌ demo-wallets.json not found. Run: npm run generate-wallets");
    process.exit(1);
  }

  const wallets = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
  const [deployer] = await hre.ethers.getSigners();

  const amountPerWallet = hre.ethers.parseEther("0.1"); // 0.1 MON per wallet
  const totalNeeded = amountPerWallet * BigInt(wallets.length);
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`Deployer: ${deployer.address}`);
  console.log(`Deployer balance: ${hre.ethers.formatEther(deployerBalance)} MON`);
  console.log(`Funding ${wallets.length} wallets with ${hre.ethers.formatEther(amountPerWallet)} MON each`);
  console.log(`Total needed: ${hre.ethers.formatEther(totalNeeded)} MON`);

  if (deployerBalance < totalNeeded) {
    console.log(`\n⚠️ Note: Deployer has ${hre.ethers.formatEther(deployerBalance)} MON, which is less than the theoretical ${hre.ethers.formatEther(totalNeeded)} MON needed for all wallets. Proceeding anyway because some may already be funded...`);
  }

  console.log("\nSending...");
  for (let i = 0; i < wallets.length; i++) {
    try {
      const balance = await hre.ethers.provider.getBalance(wallets[i].address);
      if (balance >= amountPerWallet) {
        console.log(`  ⏭️ #${i} ${wallets[i].address} — Already funded.`);
        continue;
      }
      
      const tx = await deployer.sendTransaction({
        to: wallets[i].address,
        value: amountPerWallet,
      });
      await tx.wait();
      console.log(`  ✅ #${i} ${wallets[i].address} — tx: ${tx.hash}`);
      
      // Small delay to help with rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.log(`  ❌ #${i} ${wallets[i].address} — failed: ${err.shortMessage || err.message}`);
    }
  }

  console.log(`\n✅ Funded ${wallets.length} wallets successfully.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
