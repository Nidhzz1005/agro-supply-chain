# 🌾 Agro Supply Chain

A full-stack **agricultural supply chain management system** that connects farmers, distributors, retailers, and consumers on a blockchain-backed platform — with **AI/ML predictions** for demand forecasting, spoilage risk, and fair pricing.

```
Farmer ──▶ Distributor ──▶ Retailer ──▶ Consumer
   │            │             │             │
   └────────────┴───── Blockchain ──────────┘
                     (product provenance)
                          +
              ML API (demand / spoilage / price)
```

---

## ✨ Features

| Role | What they can do |
|------|------------------|
| **Producer (Farmer)** | Add products, forecast demand, get fair price predictions, track sales |
| **Distributor** | Create shipments, check spoilage risk on routes, update transit status |
| **Retailer** | Mark delivery, verify fair-share pricing, sell to consumers |
| **Consumer** | View purchase history and full product provenance |

**AI/ML models** (served by a Python microservice):
- **Demand Forecast** — Random Forest (R² ≈ 0.80): predicted crop demand by produce, city, month
- **Spoilage Risk** — Logistic Regression: LOW / MEDIUM / HIGH risk for a route & produce
- **Price + Fair Share** — Gradient Boosting (R² ≈ 0.99): fair wholesale/retail price and producer's share %

---

## 🏗️ Architecture

| Component | Tech | Port | Folder |
|-----------|------|------|--------|
| Smart contract | Solidity + Hardhat | 8545 (local node) | `contracts/`, `scripts/` |
| Backend API | Node.js + Express + MongoDB + JWT | 5000 | `backend/` |
| ML service | Python + Flask + scikit-learn | 5001 | `ml-api/` |
| Frontend | React (CRA) + ethers.js + MetaMask | 3000 | `frontend/` |

**Flow:** React UI → Express API (auth/products) + Flask ML service (predictions) → Hardhat local blockchain (on-chain provenance) → MongoDB (off-chain data).

---

## 📦 Prerequisites

Install these once:

1. **Node.js** — https://nodejs.org → click **LTS**
2. **Python** — https://www.python.org/downloads → check **"Add Python to PATH"**
3. **MongoDB Community** — https://www.mongodb.com/try/download/community → Windows x64 MSI → check **"Install as a Service"**
4. **MetaMask** — https://metamask.io → add to Chrome

Verify:

```bash
node --version
npm --version
python --version
pip --version
```

All four must print a version number.

---

## 🚀 Setup & Run (First Time)

Open **5 terminals**, all in the project root.

### Terminal 1 — Blockchain node

```bash
npm install --legacy-peer-deps
npx hardhat compile
npx hardhat node
```

⚠️ **Keep this running.** Copy a private key shown (starts with `0x`) — you'll need it for MetaMask.

### Terminal 2 — Deploy the contract

```bash
npx hardhat run scripts/deploy.js --network localhost
mkdir frontend\src\contracts\contracts\SupplyChain.sol
copy artifacts\contracts\SupplyChain.sol\SupplyChain.json frontend\src\contracts\contracts\SupplyChain.sol\SupplyChain.json
```

Expected: `SupplyChain deployed to: 0x...`

### Terminal 3 — Backend

```bash
cd backend
copy .env.example .env        # then edit JWT_SECRET if you want
npm install
npm run dev
```

Expected: `MongoDB connected` + `Server running on http://localhost:5000`

### Terminal 4 — ML API

```bash
cd ml-api
pip install -r requirements.txt
python train.py               # one-time: trains & saves the 3 models
python app.py
```

Expected: `All models loaded successfully` + `Running on http://localhost:5001`

### Terminal 5 — Frontend

```bash
cd frontend
npm install
npm start
```

Opens at **http://localhost:3000**

### Run every time (after first setup)

| Terminal | Command |
|----------|---------|
| 1 | `npx hardhat node` |
| 2 | `npx hardhat run scripts/deploy.js --network localhost` + copy artifact |
| 3 | `cd backend && npm run dev` |
| 4 | `cd ml-api && python app.py` |
| 5 | `cd frontend && npm start` |

---

## 🦊 MetaMask Setup (Once)

1. Open MetaMask → **Add Network**:
   - **Network Name:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Symbol:** `ETH`
2. **Import Account** → paste the private key from Terminal 1 (this is your **Producer**).
3. Import **Account #1** and **Account #2** private keys from Terminal 1 as well — they become your **Distributor** and **Retailer** wallets.

---

## 🎮 Demo Flow

Register four users:

| Username | Role | MetaMask account |
|----------|------|------------------|
| `farmer1` | Producer | Account #0 |
| `transporter1` | Distributor | Account #1 |
| `shop1` | Retailer | Account #2 |
| `customer1` | Consumer | — |

**Producer (`farmer1`)**
1. Login → **Connect Wallet** (Account 0)
2. 📈 **Demand Forecast** → Wheat, Mumbai, October → see predicted demand
3. 💰 **Price Predict** → fair wholesale & retail price
4. ➕ **Add Product** → Wheat, 500 kg, Nashik → confirm in MetaMask

**Distributor (`transporter1`)**
1. Login → switch MetaMask to Account 1 → **Connect Wallet**
2. 🥬 **Spoilage Risk** → Tomato, Nashik → Delhi → see risk level
3. 📦 **Create Shipment** → select products → confirm in MetaMask

**Retailer (`shop1`)**
1. Login → switch MetaMask to Account 2 → **Connect Wallet**
2. 🏪 **Mark Delivered** on a product → confirm in MetaMask
3. 💰 **Fair Share Check** → enter producer price → see if it's fair
4. 🛒 **Sell to Consumer** → buyer `customer1`, qty 5 kg → confirm

**Consumer (`customer1`)**
1. Login → **My Purchases** shows what was bought

---

## 🤖 ML Models

| Model | Algorithm | Used by | Predicts |
|-------|-----------|---------|----------|
| Demand Forecast | Random Forest (R² = 0.80) | Producer | How much crop is needed |
| Spoilage Risk | Logistic Regression | Distributor | LOW / MEDIUM / HIGH spoilage risk |
| Price + Fair Share | Gradient Boosting (R² = 0.99) | All roles | Fair price + producer share % |

Models are trained by `ml-api/train.py` and served by `ml-api/app.py`.

---

## 📁 Project Structure

```
agro-supply-chain/
├── contracts/          # SupplyChain.sol (Solidity smart contract)
├── scripts/            # deploy.js (contract deployment)
├── backend/            # Express API — auth, products, ML proxy
│   ├── models/         # Mongoose schemas (User, Product, Shipment)
│   ├── routes/         # auth.js, products.js, ml.js
│   └── middleware/     # JWT auth
├── frontend/           # React app (UI + ethers.js + MetaMask)
│   └── src/components/ # Dashboard, ML panels, wallet, product cards
├── ml-api/             # Flask ML microservice
│   ├── train.py        # trains the 3 models
│   ├── app.py          # prediction endpoints (port 5001)
│   └── data/           # training datasets
└── hardhat.config.js   # Hardhat configuration
```

---

## ❌ Troubleshooting

| Error | Fix |
|-------|-----|
| `hardhat@3` asked to install | Type `n` + Enter, then `npm install --legacy-peer-deps` |
| HH801 plugin error | `hardhat.config.js` line 1 must be `require("@nomiclabs/hardhat-ethers");` — not `hardhat-toolbox` |
| Cannot connect to MongoDB | PowerShell as Admin → `net start MongoDB` |
| `contract-address.json not found` | Re-run Terminal 2 deploy steps |
| `ML service unavailable` | Check Terminal 4 is running; if `models/` is empty, run `python train.py` |
| MetaMask "nonce too high" | MetaMask → Settings → Advanced → **Reset Account** |
| Wrong network in MetaMask | Switch to **Hardhat Local** (Chain ID 31337) |

---

## 🔐 Security Notes

- `backend/.env` is **git-ignored** — never commit it. Copy from `.env.example`.
- Hardhat private keys are for **local development only** — never use them on mainnet.
- Change `JWT_SECRET` from the default before deploying anywhere real.
