const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const contract = await SupplyChain.deploy();
  await contract.deployed();

  console.log("SupplyChain deployed to:", contract.address);

  // Save contract address to frontend
  const contractsDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Write the address file
  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ SupplyChain: contract.address }, null, 2)
  );

  // Copy the ABI artifact from hardhat's default artifacts folder
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/SupplyChain.sol/SupplyChain.json"
  );
  const destDir = path.join(contractsDir, "contracts/SupplyChain.sol");
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(artifactPath, path.join(destDir, "SupplyChain.json"));

  console.log("✅ Contract address + ABI saved to frontend/src/contracts/");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
