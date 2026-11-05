import React, { useState } from "react";
import { api } from "../api";
import styles from "./MLPanel.module.css";

const CITIES = ["Nashik","Mumbai","Pune","Delhi","Bangalore","Hyderabad","Chennai","Kolkata"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function PricePredict({ cropName, quantity, onClose, showFairShare }) {
  const [form, setForm] = useState({
    crop: cropName || "",
    city: "Mumbai",
    month: new Date().getMonth() + 1,
    quantity: quantity || "",
    producerPrice: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePredict(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        crop: form.crop,
        city: form.city,
        month: Number(form.month),
        quantity: Number(form.quantity),
      };
      if (showFairShare && form.producerPrice) {
        payload.producerPrice = Number(form.producerPrice);
      }
      const data = await api.predictPrice(payload);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>💰 Price Prediction {showFairShare ? "+ Fair Share Alert" : ""}</h2>
            <p className={styles.subtitle}>Linear Regression Model</p>
          </div>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handlePredict} className={styles.form}>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>Crop Name</label>
              <input value={form.crop} onChange={e=>setForm(f=>({...f,crop:e.target.value}))}
                placeholder="e.g. Wheat" required />
            </div>
            <div className={styles.field}>
              <label>Target Market City</label>
              <select value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}>
                {CITIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Month</label>
              <select value={form.month} onChange={e=>setForm(f=>({...f,month:e.target.value}))}>
                {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Quantity (kg)</label>
              <input type="number" min="1" value={form.quantity}
                onChange={e=>setForm(f=>({...f,quantity:e.target.value}))}
                placeholder="e.g. 500" required />
            </div>
          </div>

          {showFairShare && (
            <div className={styles.field}>
              <label>Producer's Selling Price ₹/kg (optional — for fair share check)</label>
              <input type="number" min="0" step="0.5" value={form.producerPrice}
                onChange={e=>setForm(f=>({...f,producerPrice:e.target.value}))}
                placeholder="What price did/will the producer receive?" />
            </div>
          )}

          {error && <p className={styles.error}>⚠️ {error}</p>}

          <button type="submit" className={styles.predictBtn} disabled={loading}>
            {loading ? "Calculating…" : "💰 Predict Price"}
          </button>
        </form>

        {result && (
          <div className={styles.result}>
            {/* Price Cards */}
            <div className={styles.priceGrid}>
              <PriceCard label="Producer Price" value={result.pricePerKg} desc="Recommended wholesale" color="#2d7a4f" />
              <PriceCard label="Retail Price" value={result.retailPrice} desc="Consumer pays" color="#1565c0" />
              <PriceCard label="Min Fair Price" value={result.minFairPrice} desc="Producer minimum" color="#f57f17" />
            </div>

            <div className={styles.totalBox}>
              <span>Total batch value ({result.quantity}kg)</span>
              <span style={{fontWeight:800, fontSize:"1.1rem", color:"#2d7a4f"}}>₹{result.totalValue.toLocaleString()}</span>
            </div>

            {/* Fair Share Alert */}
            {result.alert && (
              <div className={styles.alertBox}
                style={{
                  background: result.alert.type === "warning" ? "#fff8e1" : "#e8f5e9",
                  borderColor: result.alert.type === "warning" ? "#ffe082" : "#a5d6a7",
                }}>
                <p style={{fontSize:"1.1rem"}}>{result.alert.emoji}</p>
                <p style={{fontSize:"0.88rem", color: result.alert.type === "warning" ? "#7c5c00" : "#2e7d32"}}>
                  {result.alert.message}
                </p>
                {result.fairSharePct && (
                  <div className={styles.shareBar}>
                    <div style={{
                      width:`${Math.min(100, result.fairSharePct)}%`,
                      height:"100%", borderRadius:4,
                      background: result.fairSharePct >= 50 ? "#2d7a4f" : "#e53935",
                      transition:"width 0.5s"
                    }} />
                    <span className={styles.shareLabel}>{result.fairSharePct}% producer share</span>
                  </div>
                )}
              </div>
            )}

            <div className={styles.algoTag}>Algorithm: Linear Regression | Margin: 28% retail markup</div>
          </div>
        )}
      </div>
    </div>
  );
}

function PriceCard({ label, value, desc, color }) {
  return (
    <div className={styles.priceCard} style={{borderTopColor: color}}>
      <p className={styles.priceCardLabel}>{label}</p>
      <p className={styles.priceCardVal} style={{color}}>₹{value}</p>
      <p className={styles.priceCardDesc}>{desc}</p>
    </div>
  );
}
