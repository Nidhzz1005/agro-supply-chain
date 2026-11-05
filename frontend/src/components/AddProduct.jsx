import React, { useState } from "react";
import { api } from "../api";
import styles from "./Modal.module.css";

export default function AddProduct({ contract, onClose, onAdded }) {
  const [form, setForm] = useState({ name: "", quantity: "", location: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    let blockchainProductId = null;
    let blockchainTxHash = null;

    try {
      // 1. Write to blockchain if wallet connected
      if (contract) {
        setStatus("Waiting for MetaMask confirmation…");
        const tx = await contract.createProduct(Number(form.quantity));
        setStatus("Transaction sent. Waiting for confirmation…");
        const receipt = await tx.wait();
        blockchainTxHash = receipt.transactionHash;

        // Parse productId from event
        const event = receipt.events?.find((e) => e.event === "ProductCreated");
        if (event) blockchainProductId = event.args.productId.toNumber();
        setStatus("Blockchain confirmed ✓");
      }

      // 2. Save to MongoDB
      setStatus("Saving to database…");
      const saved = await api.createProduct({
        name: form.name,
        quantity: Number(form.quantity),
        location: form.location,
        blockchainProductId,
        blockchainTxHash,
      });

      onAdded(saved);
      onClose();
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>➕ Add New Product</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Product Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Wheat, Rice, Tomatoes"
              required
            />
          </div>

          <div className={styles.field}>
            <label>Quantity (kg)</label>
            <input
              name="quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={handleChange}
              placeholder="e.g. 500"
              required
            />
          </div>

          <div className={styles.field}>
            <label>Origin Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Nashik, Maharashtra"
              required
            />
          </div>

          {!contract && (
            <p className={styles.warning}>
              ⚠️ Wallet not connected — product will be saved to DB only (no blockchain record).
            </p>
          )}

          {status && <p className={styles.statusMsg}>⏳ {status}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Processing…" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
