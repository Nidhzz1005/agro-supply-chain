import React, { useState } from "react";
import { api } from "../api";
import styles from "./Modal.module.css";

const NEXT_STATUS = {
  Distributor: { from: "Produced", to: "In Transit", blockchainStatus: 1, onChainFrom: 0 },
  Retailer: { from: "In Transit", to: "Delivered", blockchainStatus: 2, onChainFrom: 1 },
};

export default function UpdateStatus({ product, userRole, contract, onClose, onUpdated }) {
  const [txStatus, setTxStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const transition = NEXT_STATUS[userRole];
  const canUpdate = product.status === transition?.from;

  async function handleUpdate() {
    setLoading(true);
    setError("");
    let blockchainTxHash = null;

    try {
      if (contract && product.blockchainProductId !== null) {
        let chainOk = true;
        try {
          const onChain = await contract.getProduct(product.blockchainProductId);
          if (onChain.status !== transition.onChainFrom) {
            chainOk = false;
            setTxStatus("⚠️ Blockchain record out of sync — status will update in DB only.");
          }
        } catch (e) {
          chainOk = false;
          setTxStatus("⚠️ Product not found on-chain — status will update in DB only.");
        }

        if (chainOk) {
          setTxStatus("Waiting for MetaMask confirmation…");
          const tx = await contract.updateStatus(
            product.blockchainProductId,
            transition.blockchainStatus
          );
          setTxStatus("Transaction sent. Confirming…");
          const receipt = await tx.wait();
          blockchainTxHash = receipt.transactionHash;
          setTxStatus("Blockchain confirmed ✓");
        }
      }

      setTxStatus(blockchainTxHash ? "Blockchain confirmed ✓  Saving to DB…" : "Saving to DB…");
      const updated = await api.updateStatus({
        productId: product._id,
        blockchainTxHash,
      });

      onUpdated(updated);
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
          <h2>📦 Update Product Status</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.form}>
          <div className={styles.infoGrid}>
            <InfoRow label="Product" value={product.name} />
            <InfoRow label="Quantity" value={`${product.quantity} kg`} />
            <InfoRow label="Origin" value={product.location} />
            <InfoRow label="Current Status" value={<StatusBadge status={product.status} />} />
            {canUpdate && (
              <InfoRow label="New Status" value={<StatusBadge status={transition.to} />} />
            )}
            {product.blockchainProductId !== null && (
              <InfoRow label="Chain ID" value={`#${product.blockchainProductId}`} />
            )}
          </div>

          {!canUpdate && (
            <p className={styles.warning}>
              ⚠️ This product is <strong>{product.status}</strong>. As a {userRole}, you can only
              update products that are <strong>{transition?.from}</strong>.
            </p>
          )}

          {!contract && canUpdate && (
            <p className={styles.warning}>
              ⚠️ Wallet not connected — status will update in DB only.
            </p>
          )}

          {txStatus && <p className={styles.statusMsg}>⏳ {txStatus}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            {canUpdate && (
              <button className={styles.submitBtn} onClick={handleUpdate} disabled={loading}>
                {loading ? "Processing…" : `Mark as "${transition.to}"`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ fontSize: "0.82rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</span>
      <span style={{ fontSize: "0.92rem", color: "#222", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    "Produced": { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
    "In Transit": { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
    "Delivered": { bg: "#f3e5f5", color: "#6a1b9a", border: "#ce93d8" },
  };
  const c = colors[status] || { bg: "#f5f5f5", color: "#555", border: "#ddd" };
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      padding: "0.2rem 0.65rem", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700
    }}>
      {status}
    </span>
  );
}
