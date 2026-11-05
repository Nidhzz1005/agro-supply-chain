const router = require("express").Router();
const Product = require("../models/Product");
const Shipment = require("../models/Shipment");
const auth = require("../middleware/auth");

// GET /products
router.get("/", auth, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /products/shipments - all shipments with populated products
router.get("/shipments", auth, async (req, res) => {
  try {
    const shipments = await Shipment.find()
      .populate("productIds")
      .sort({ createdAt: -1 });
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /product/create - Producer only
router.post("/create", auth, async (req, res) => {
  try {
    if (req.user.role !== "Producer")
      return res.status(403).json({ message: "Only Producers can create products" });

    const { name, quantity, location, blockchainProductId, blockchainTxHash } = req.body;
    if (!name || !quantity || !location)
      return res.status(400).json({ message: "Name, quantity, and location are required" });

    const product = await Product.create({
      name,
      quantity: Number(quantity),
      originalQuantity: Number(quantity),
      location,
      producerUsername: req.user.username,
      blockchainProductId: blockchainProductId ?? null,
      blockchainTxHash: blockchainTxHash ?? null,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /product/consolidate - Distributor consolidates multiple products into shipment
router.post("/consolidate", auth, async (req, res) => {
  try {
    if (req.user.role !== "Distributor")
      return res.status(403).json({ message: "Only Distributors can consolidate shipments" });

    const { productIds, blockchainShipmentId, blockchainTxHash } = req.body;
    if (!productIds || productIds.length === 0)
      return res.status(400).json({ message: "Select at least one product" });

    // Validate all products are in Produced state
    const products = await Product.find({ _id: { $in: productIds } });
    for (const p of products) {
      if (p.status !== "Produced")
        return res.status(400).json({ message: `Product "${p.name}" is not in Produced state` });
    }

    // Create shipment
    const shipment = await Shipment.create({
      distributorUsername: req.user.username,
      productIds,
      blockchainShipmentId: blockchainShipmentId ?? null,
      blockchainTxHash: blockchainTxHash ?? null,
    });

    // Update all products to In Transit
    await Product.updateMany(
      { _id: { $in: productIds } },
      {
        status: "In Transit",
        distributorUsername: req.user.username,
        shipmentId: shipment._id,
      }
    );

    const populated = await Shipment.findById(shipment._id).populate("productIds");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /product/update-status - Retailer marks delivered
router.put("/update-status", auth, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "Retailer")
      return res.status(403).json({ message: "Only Retailers can mark products as Delivered" });

    const { productId, blockchainTxHash } = req.body;
    if (!productId)
      return res.status(400).json({ message: "productId is required" });

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    if (product.status !== "In Transit")
      return res.status(400).json({ message: "Product must be In Transit to mark as Delivered" });

    product.status = "Delivered";
    product.retailerUsername = req.user.username;
    if (blockchainTxHash) product.blockchainTxHash = blockchainTxHash;
    await product.save();

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /product/sell - Retailer sells partial quantity to Consumer
router.post("/sell", auth, async (req, res) => {
  try {
    if (req.user.role !== "Retailer")
      return res.status(403).json({ message: "Only Retailers can sell products" });

    const { productId, quantity, buyerUsername, blockchainTxHash } = req.body;
    if (!productId || !quantity || !buyerUsername)
      return res.status(400).json({ message: "productId, quantity, and buyerUsername are required" });

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    if (!["Delivered", "Partially Sold"].includes(product.status))
      return res.status(400).json({ message: "Product must be Delivered to sell" });

    if (quantity > product.quantity)
      return res.status(400).json({ message: `Only ${product.quantity}kg available` });

    // Deduct quantity
    product.quantity -= Number(quantity);
    product.saleLedger.push({ buyerUsername, quantity: Number(quantity), blockchainTxHash });
    product.status = product.quantity === 0 ? "Sold Out" : "Partially Sold";
    if (blockchainTxHash) product.blockchainTxHash = blockchainTxHash;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /product/my-purchases - Consumer sees what they bought
router.get("/my-purchases", auth, async (req, res) => {
  try {
    if (req.user.role !== "Consumer")
      return res.status(403).json({ message: "Only Consumers can view purchases" });

    const products = await Product.find({
      "saleLedger.buyerUsername": req.user.username,
    });

    // Filter ledger to only show this consumer's entries
    const purchases = products.map((p) => ({
      productName: p.name,
      location: p.location,
      producerUsername: p.producerUsername,
      purchases: p.saleLedger.filter((s) => s.buyerUsername === req.user.username),
    }));

    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
