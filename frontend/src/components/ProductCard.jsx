import React from "react";
import styles from "./ProductCard.module.css";

const STATUS_CONFIG = {
  "Produced":       { icon: "🌱", bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  "In Transit":     { icon: "🚛", bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
  "Delivered":      { icon: "🏪", bg: "#fff8e1", color: "#f57f17", border: "#ffe082" },
  "Partially Sold": { icon: "🛒", bg: "#f3e5f5", color: "#6a1b9a", border: "#ce93d8" },
  "Sold Out":       { icon: "✅", bg: "#fce4ec", color: "#880e4f", border: "#f48fb1" },
};

export default function ProductCard({ product, userRole, onUpdateClick, onSellClick }) {
  const s = STATUS_CONFIG[product.status] || STATUS_CONFIG["Produced"];

  const canMarkDelivered = userRole === "Retailer" && product.status === "In Transit";
  const canSell = userRole === "Retailer" && ["Delivered", "Partially Sold"].includes(product.status);

  const pct = Math.round((product.quantity / product.originalQuantity) * 100);

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div>
          <h3 className={styles.name}>{product.name}</h3>
          <p className={styles.meta}>📍 {product.location} · 👤 {product.producerUsername}</p>
        </div>
        <span className={styles.badge} style={{ background: s.bg, color: s.color, borderColor: s.border }}>
          {s.icon} {product.status}
        </span>
      </div>

      {/* Quantity progress bar */}
      <div className={styles.qtyRow}>
        <span className={styles.qtyLabel}>
          <strong>{product.quantity}kg</strong> remaining of {product.originalQuantity}kg
        </span>
        <span className={styles.qtyPct}>{pct}%</span>
      </div>
      <div className={styles.progressBg}>
        <div className={styles.progressFill} style={{ width: `${pct}%`, background: s.color }} />
      </div>

      <div className={styles.details}>
        <Detail label="Created" value={timeAgo(product.createdAt)} />
        {product.distributorUsername && <Detail label="Distributor" value={product.distributorUsername} />}
        {product.retailerUsername && <Detail label="Retailer" value={product.retailerUsername} />}
        {product.blockchainProductId !== null && <Detail label="Chain ID" value={`#${product.blockchainProductId}`} />}
        {product.blockchainTxHash && <Detail label="Tx Hash" value={`${product.blockchainTxHash.slice(0, 10)}…`} mono />}
      </div>

      {/* Sale ledger for retailer */}
      {userRole === "Retailer" && product.saleLedger && product.saleLedger.length > 0 && (
        <div className={styles.ledger}>
          <p className={styles.ledgerTitle}>Sales History</p>
          {product.saleLedger.map((s, i) => (
            <div key={i} className={styles.ledgerRow}>
              <span>{s.buyerUsername}</span>
              <span>{s.quantity}kg</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.btnRow}>
        {canMarkDelivered && (
          <button className={styles.actionBtn} onClick={() => onUpdateClick(product)}>
            🏪 Mark Delivered
          </button>
        )}
        {canSell && (
          <button className={styles.sellBtn} onClick={() => onSellClick(product)}>
            🛒 Sell to Consumer
          </button>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div className={styles.detail}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue} style={mono ? { fontFamily: "monospace" } : {}}>{value}</span>
    </div>
  );
}
