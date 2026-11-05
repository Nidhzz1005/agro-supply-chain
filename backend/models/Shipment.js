const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    distributorUsername: { type: String, required: true },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    status: {
      type: String,
      enum: ["Consolidated", "Dispatched"],
      default: "Consolidated",
    },
    blockchainShipmentId: { type: Number, default: null },
    blockchainTxHash: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shipment", shipmentSchema);
