import React, { useState } from "react";
import { api } from "../api";
import styles from "./Modal.module.css";

export default function SellProduct({ product, contract, onClose, onSold }) {
  const [form, setForm] = useState({ quantity: "", buyerUsername: "" });
  const [txStatus, setTxStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSell(e) {
    e.preventDefault();
    const qty = Number(form.quantity);
    if (!qty || qty <= 0) return setError("Enter a valid quantity");
    if (qty > product.quantity) return setError(`Only ${product.quantity}kg available`);
    if (!form.buyerUsername.trim()) return setError("Enter buyer username");

    setLoading(true);
    setError("");
    let blockchainTxHash = null;

    try {
      if (contract && product.blockchainProductId !== null) {
        let chainOk = true;
        try {
          const onChain = await contract.getProduct(product.blockchainProductId);
          const sellable = onChain.status === 2 || onChain.status === 3;
          if (!sellable || onChain.quantity.lt(qty)) {
            chainOk = false;
            setTxStatus("⚠️ Blockchain record out of sync — this sale will be saved to DB only.");
          }
        } catch (e) {
          chainOk = false;
          setTxStatus("⚠️ Product not found on-chain — this sale will be saved to DB only.");
        }

        if (chainOk) {
          setTxStatus("Waiting for MetaMask confirmation…");
          const tx = await contract.sellQuantity(product.blockchainProductId, qty);
          setTxStatus("Confirming…");
          const receipt = await tx.wait();
          blockchainTxHash = receipt.transactionHash;
          setTxStatus("Blockchain confirmed ✓");
        }
      }

      const updated = await api.sell({
        productId: product._id,
        quantity: qty,
        buyerUsername: form.buyerUsername.trim(),
        blockchainTxHash,
      });

      onSold(updated);
      onClose();
    } catch (err) {
      setError(err.message);
      setTxStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>🛒 Sell to Consumer</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>
        <div className={styles.form}>
          {/* Product info */}
          <div style={{ background: "#f8fdf8", border: "1px solid #c8e6c9", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "0.5rem" }}>
            <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>{product.name}</p>
            <p style={{ fontSize: "0.82rem", color: "#666" }}>
              Available: <strong style={{ color: "#2d7a4f" }}>{product.quantity}kg</strong> of {product.originalQuantity}kg
            </p>
            {/* Progress bar */}
            <div style={{ marginTop: "0.4rem", height: 6, background: "#e0e0e0", borderRadius: 3 }}>
              <div style={{
                height: "100%", borderRadius: 3, background: "#2d7a4f",
                width: `${(product.quantity / product.originalQuantity) * 100}%`,
                transition: "width 0.3s"
              }} />
            </div>
          </div>

          {/* Sale ledger */}
          {product.saleLedger && product.saleLedger.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: "0.3rem" }}>Previous Sales</p>
              {product.saleLedger.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", padding: "0.2rem 0", borderBottom: "1px solid #f0f0f0" }}>
                  <span>{s.buyerUsername}</span>
                  <span style={{ color: "#2d7a4f", fontWeight: 600 }}>{s.quantity}kg</span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSell} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className={styles.field}>
              <label>Buyer Username (Consumer)</label>
              <input name="buyerUsername" value={form.buyerUsername}
                onChange={(e) => setForm(f => ({ ...f, buyerUsername: e.target.value }))}
                placeholder="e.g. customer1" required />
            </div>
            <div className={styles.field}>
              <label>Quantity to Sell (kg)</label>
              <input name="quantity" type="number" min="1" max={product.quantity}
                value={form.quantity}
                onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder={`Max ${product.quantity}kg`} required />
            </div>

            {!contract && <p className={styles.warning}>⚠️ Wallet not connected — DB only.</p>}
            {txStatus && <p className={styles.statusMsg}>⏳ {txStatus}</p>}
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? "Processing…" : "✅ Confirm Sale"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
