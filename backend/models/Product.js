const mongoose = require("mongoose");

const saleLedgerSchema = new mongoose.Schema({
  buyerUsername: { type: String, required: true },
  quantity: { type: Number, required: true },
  soldAt: { type: Date, default: Date.now },
  blockchainTxHash: { type: String, default: null },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },        // remaining qty (0 = Sold Out)
    originalQuantity: { type: Number, required: true },        // starting qty
    location: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Produced", "In Transit", "Delivered", "Partially Sold", "Sold Out"],
      default: "Produced",
    },
    producerUsername: { type: String, required: true },
    distributorUsername: { type: String, default: null },
    retailerUsername: { type: String, default: null },
    shipmentId: { type: String, default: null },              // which shipment this belongs to
    blockchainProductId: { type: Number, default: null },
    blockchainTxHash: { type: String, default: null },
    saleLedger: [saleLedgerSchema],                           // who bought how much
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
