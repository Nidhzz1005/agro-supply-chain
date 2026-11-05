const router = require("express").Router();
const fetch = require("node-fetch");
const auth = require("../middleware/auth");

const ML_API = "http://127.0.0.1:5001";

async function callML(path, body) {
  const res = await fetch(`${ML_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("ML API error");
  return res.json();
}

router.post("/demand", auth, async (req, res) => {
  try {
    const result = await callML("/predict/demand", req.body);
    res.json(result);
  } catch {
    res.status(503).json({ message: "ML service unavailable. Make sure python app.py is running on port 5001." });
  }
});

router.post("/spoilage", auth, async (req, res) => {
  try {
    const result = await callML("/predict/spoilage", req.body);
    res.json(result);
  } catch {
    res.status(503).json({ message: "ML service unavailable. Make sure python app.py is running on port 5001." });
  }
});

router.post("/price", auth, async (req, res) => {
  try {
    const result = await callML("/predict/price", req.body);
    res.json(result);
  } catch {
    res.status(503).json({ message: "ML service unavailable. Make sure python app.py is running on port 5001." });
  }
});

module.exports = router;
