require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes    = require("./routes/auth");
const productRoutes = require("./routes/products");
const mlRoutes      = require("./routes/ml");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth",    authRoutes);
app.use("/product", productRoutes);
app.use("/products",productRoutes);
app.use("/ml",      mlRoutes);

app.get("/", (req, res) => res.json({ status: "Agro Supply Chain API running" }));

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => { console.error("MongoDB error:", err.message); process.exit(1); });
