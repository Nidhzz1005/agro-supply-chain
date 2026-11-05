# 🌾 Agro Supply Chain — Complete Setup Guide

## 📥 INSTALL THESE FIRST (Fresh Laptop)

1. Node.js  → https://nodejs.org → click LTS
2. Python   → https://www.python.org/downloads → check "Add Python to PATH" during install
3. MongoDB  → https://www.mongodb.com/try/download/community → Windows x64, MSI → check "Install as a Service"
4. MetaMask → https://metamask.io → Add to Chrome

Verify installs — open a terminal and run:
  node --version
  npm --version
  python --version
  pip --version

All 4 should show version numbers before continuing.

---

## 🚀 HOW TO RUN (Every Time)

Open 5 separate terminals. Run each in order.

---

### TERMINAL 1 — Blockchain Node

cd C:\path\to\agro-supply-chain

First time only:
  npm install --legacy-peer-deps
  npm install --save-dev @nomiclabs/hardhat-ethers@2.2.3 ethers@5.7.2 --legacy-peer-deps

Every time:
  npx hardhat compile
  npx hardhat node

⚠️ KEEP OPEN. Copy any Private Key shown (starts with 0x).

---

### TERMINAL 2 — Deploy Contract

cd C:\path\to\agro-supply-chain

  npx hardhat run scripts/deploy.js --network localhost
  mkdir frontend\src\contracts\contracts\SupplyChain.sol
  copy artifacts\contracts\SupplyChain.sol\SupplyChain.json frontend\src\contracts\contracts\SupplyChain.sol\SupplyChain.json

Should say: SupplyChain deployed to: 0x...

---

### TERMINAL 3 — Backend

cd C:\path\to\agro-supply-chain\backend

First time only:
  copy .env.example .env
  npm install

Every time:
  npm run dev

Should say: MongoDB connected + Server running on http://localhost:5000

---

### TERMINAL 4 — ML API (Python)

cd C:\path\to\agro-supply-chain\ml-api

First time only:
  pip install -r requirements.txt

Train models (run once, or after reset):
  python train.py

Should say: All 3 models trained and saved to models/

Every time:
  python app.py

Should say: All models loaded successfully + Running on http://localhost:5001

---

### TERMINAL 5 — Frontend

cd C:\path\to\agro-supply-chain\frontend

First time only:
  npm install

Every time:
  npm start

Opens at http://localhost:3000

---

## 🦊 METAMASK SETUP (Once)

1. Open MetaMask in Chrome
2. Add Network:
   Name:     Hardhat Local
   RPC URL:  http://127.0.0.1:8545
   Chain ID: 31337
   Symbol:   ETH
3. Import Account → paste Private Key from Terminal 1
4. Add 2 more accounts (Account #1 and #2 private keys) for Distributor and Retailer

---

## 🎮 DEMO FLOW FOR PRESENTATION

Register these 4 users:
  farmer1      → Producer
  transporter1 → Distributor
  shop1        → Retailer
  customer1    → Consumer

--- Producer (farmer1) ---
1. Login → Connect Wallet (MetaMask Account 1)
2. Click 📈 Demand Forecast → enter Wheat, Mumbai, October → see predicted demand
3. Click 💰 Price Predict → see fair wholesale and retail price
4. Click ➕ Add Product → Wheat, 500kg, Nashik → Confirm MetaMask

--- Distributor (transporter1) ---
1. Login → Switch MetaMask to Account 2 → Connect Wallet
2. Click 🥬 Spoilage Risk → select Tomato, Nashik→Delhi → see HIGH risk warning
3. Click 📦 Create Shipment → select products → Confirm MetaMask

--- Retailer (shop1) ---
1. Login → Switch MetaMask to Account 3 → Connect Wallet
2. Click 🏪 Mark Delivered on a product → Confirm MetaMask
3. Click 💰 Fair Share Check → enter producer price → see if fair
4. Click 🛒 Sell to Consumer → buyer: customer1, qty: 5kg → Confirm

--- Consumer (customer1) ---
1. Login → See My Purchases showing what was bought

---

## ❌ COMMON ERRORS AND FIXES

Error: hardhat@3 asked to install
Fix:   Type n and press Enter. Then run npm install --legacy-peer-deps

Error: HH801 plugin error
Fix:   Open hardhat.config.js in Notepad. Line 1 must be:
       require("@nomiclabs/hardhat-ethers");
       NOT require("@nomicfoundation/hardhat-toolbox");

Error: Cannot connect to MongoDB
Fix:   Open PowerShell as Administrator and run: net start MongoDB

Error: contract-address.json not found
Fix:   Run Terminal 2 deploy steps again

Error: ML service unavailable
Fix:   Check Terminal 4 is running python app.py
       If models folder is empty, run python train.py first

Error: MetaMask nonce too high
Fix:   MetaMask → Settings → Advanced → Reset Account

Error: Wrong network in MetaMask
Fix:   Switch to Hardhat Local (Chain ID 31337)

---

## 🤖 ML MODELS SUMMARY

Model              Algorithm             Who Uses It   Predicts
Demand Forecast    Random Forest (R²=0.80) Producer    How much crop is needed
Spoilage Risk      Logistic Regression     Distributor LOW/MEDIUM/HIGH spoilage risk
Price + Fair Share Gradient Boosting(R²=0.99) All     Fair price + producer share %

