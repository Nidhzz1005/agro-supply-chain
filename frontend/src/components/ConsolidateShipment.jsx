import React, { useState } from "react";
import { api } from "../api";
import styles from "./Modal.module.css";

export default function ConsolidateShipment({ products, contract, onClose, onDone }) {
  const available = products.filter((p) => p.status === "Produced");
  const [selected, setSelected] = useState([]);
  const [txStatus, setTxStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleConsolidate() {
    if (selected.length === 0) return setError("Select at least one product");
    setLoading(true);
    setError("");
    let blockchainShipmentId = null;
    let blockchainTxHash = null;

    try {
      // Get blockchain IDs of selected products
      const selectedProducts = products.filter((p) => selected.includes(p._id));
      let chainIds = selectedProducts
        .filter((p) => p.blockchainProductId !== null)
        .map((p) => p.blockchainProductId);

      // Drop IDs that don't exist on the current chain (stale records)
      if (contract && chainIds.length > 0) {
        const valid = [];
        for (const id of chainIds) {
          try { await contract.getProduct(id); valid.push(id); } catch (e) { /* skip stale */ }
        }
        if (valid.length !== chainIds.length) {
          setTxStatus("⚠️ Some products have no valid on-chain record — they will ship as DB-only.");
        }
        chainIds = valid;
      }

      if (contract && chainIds.length > 0) {
        setTxStatus("Waiting for MetaMask confirmation…");
        const tx = await contract.createShipment(chainIds);
        setTxStatus("Confirming transaction…");
        const receipt = await tx.wait();
        blockchainTxHash = receipt.transactionHash;
        const event = receipt.events?.find((e) => e.event === "ShipmentCreated");
        if (event) blockchainShipmentId = event.args.shipmentId.toNumber();
        setTxStatus("Blockchain confirmed ✓");
      }

      setTxStatus("Saving to database…");
      const shipment = await api.consolidate({
        productIds: selected,
        blockchainShipmentId,
        blockchainTxHash,
      });

      onDone(shipment);
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
          <h2>📦 Create Shipment</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>
        <div className={styles.form}>
          <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
            Select products from different producers to consolidate into one shipment:
          </p>

          {available.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center", padding: "1rem" }}>
              No products available to consolidate (need status: Produced)
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "280px", overflowY: "auto" }}>
              {available.map((p) => (
                <label key={p._id} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.65rem 0.85rem", border: `2px solid ${selected.includes(p._id) ? "#2d7a4f" : "#e0e0e0"}`,
                  borderRadius: "8px", cursor: "pointer", background: selected.includes(p._id) ? "#e8f5e9" : "#fff",
                  transition: "all 0.15s"
                }}>
                  <input type="checkbox" checked={selected.includes(p._id)}
                    onChange={() => toggle(p._id)} style={{ width: 16, height: 16 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.92rem", color: "#222" }}>{p.name}</p>
                    <p style={{ fontSize: "0.78rem", color: "#888" }}>
                      {p.quantity}kg · {p.location} · by {p.producerUsername}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {selected.length > 0 && (
            <p style={{ fontSize: "0.82rem", color: "#2d7a4f", fontWeight: 600 }}>
              ✓ {selected.length} product{selected.length > 1 ? "s" : ""} selected
            </p>
          )}

          {!contract && <p className={styles.warning}>⚠️ Wallet not connected — DB only, no blockchain record.</p>}
          {txStatus && <p className={styles.statusMsg}>⏳ {txStatus}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
            <button className={styles.submitBtn} onClick={handleConsolidate}
              disabled={loading || selected.length === 0}>
              {loading ? "Processing…" : "🚛 Create Shipment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
