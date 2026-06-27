/**
 * Generate a batch of demo wallets for hackathon attendees.
 * Run with: node scripts/generate-wallets.js [count]
 * Output: demo-wallets.json (gitignored)
 */
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const count = parseInt(process.argv[2]) || 30;
const wallets = [];

for (let i = 0; i < count; i++) {
  const wallet = ethers.Wallet.createRandom();
  wallets.push({
    id: i,
    address: wallet.address,
    privateKey: wallet.privateKey,
  });
}

const outPath = path.join(__dirname, "..", "demo-wallets.json");
fs.writeFileSync(outPath, JSON.stringify(wallets, null, 2));

console.log(`✅ Generated ${count} demo wallets → ${outPath}`);
console.log("\n⚠️  WARNING: demo-wallets.json contains private keys!");
console.log("   Do NOT commit this file to version control.");
console.log("   Do NOT share it publicly.");
console.log("\nFirst 3 wallets (for verification):");
wallets.slice(0, 3).forEach((w) => {
  console.log(`  #${w.id}: ${w.address}`);
});
