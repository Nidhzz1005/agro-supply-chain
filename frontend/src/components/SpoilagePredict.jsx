import React, { useState } from "react";
import { api } from "../api";
import styles from "./MLPanel.module.css";

const CITIES = ["Nashik","Mumbai","Pune","Delhi","Bangalore","Hyderabad","Chennai","Kolkata"];
const CROPS  = ["Wheat","Rice","Tomato","Onion","Potato","Spinach","Corn","Sugarcane","Cotton","Soybean"];

const DISTANCES = {
  "Nashik-Mumbai":165,"Nashik-Pune":210,"Nashik-Delhi":1400,"Nashik-Bangalore":840,
  "Nashik-Hyderabad":510,"Nashik-Chennai":1150,"Nashik-Kolkata":1600,
  "Mumbai-Pune":150,"Mumbai-Delhi":1400,"Mumbai-Bangalore":980,"Mumbai-Hyderabad":710,
  "Pune-Delhi":1400,"Pune-Bangalore":840,"Delhi-Kolkata":1500,"Delhi-Chennai":2200,
  "Bangalore-Chennai":350,"Bangalore-Hyderabad":570,"Hyderabad-Chennai":630,
};

function getDistance(from, to) {
  return DISTANCES[`${from}-${to}`] || DISTANCES[`${to}-${from}`] || 800;
}

export default function SpoilagePredict({ onClose }) {
  const [form, setForm] = useState({
    crop: "Tomato", origin: "Nashik", destination: "Mumbai",
    month: new Date().getMonth() + 1, quantity: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePredict(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const distKm = getDistance(form.origin, form.destination);
    const transitDays = Math.max(1, Math.ceil(distKm / 400));
    try {
      const data = await api.predictSpoilage({
        crop: form.crop,
        distanceKm: distKm,
        transitDays,
        month: Number(form.month),
        quantity: Number(form.quantity) || 100,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const distKm = getDistance(form.origin, form.destination);
  const transitDays = Math.max(1, Math.ceil(distKm / 400));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>🥬 Spoilage Risk Prediction</h2>
            <p className={styles.subtitle}>Logistic Regression Classifier</p>
          </div>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handlePredict} className={styles.form}>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>Crop</label>
              <select value={form.crop} onChange={e=>setForm(f=>({...f,crop:e.target.value}))}>
                {CROPS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Quantity (kg)</label>
              <input type="number" min="1" value={form.quantity}
                onChange={e=>setForm(f=>({...f,quantity:e.target.value}))}
                placeholder="e.g. 200" required />
            </div>
            <div className={styles.field}>
              <label>Origin City</label>
              <select value={form.origin} onChange={e=>setForm(f=>({...f,origin:e.target.value}))}>
                {CITIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Destination City</label>
              <select value={form.destination} onChange={e=>setForm(f=>({...f,destination:e.target.value}))}>
                {CITIES.filter(c=>c!==form.origin).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {form.origin !== form.destination && (
            <div className={styles.routeInfo}>
              🗺️ Distance: <strong>{distKm} km</strong> &nbsp;·&nbsp;
              ⏱️ Estimated transit: <strong>{transitDays} day{transitDays>1?"s":""}</strong>
            </div>
          )}

          {error && <p className={styles.error}>⚠️ {error}</p>}

          <button type="submit" className={styles.predictBtn} disabled={loading || form.origin===form.destination}>
            {loading ? "Analyzing…" : "🔍 Predict Spoilage Risk"}
          </button>
        </form>

        {result && (
          <div className={styles.result}>
            <div className={styles.riskBadge} style={{background: result.color+"22", borderColor: result.color}}>
              <span style={{fontSize:"2rem"}}>{result.emoji}</span>
              <div>
                <p style={{fontSize:"1.3rem", fontWeight:800, color:result.color}}>{result.risk} RISK</p>
                <p style={{fontSize:"0.85rem", color:"#555"}}>{result.probability}% probability</p>
              </div>
            </div>

            <div className={styles.probRow}>
              {[["🟢 Low", result.probabilities.low, "#2e7d32"],
                ["🟡 Medium", result.probabilities.medium, "#f57f17"],
                ["🔴 High", result.probabilities.high, "#c62828"]].map(([label, val, color]) => (
                <div key={label} className={styles.probChip}>
                  <span style={{fontSize:"0.75rem", color:"#888"}}>{label}</span>
                  <span style={{fontWeight:700, color}}>{val}%</span>
                </div>
              ))}
            </div>

            <div className={styles.insightBox}>
              <p style={{fontWeight:600, marginBottom:"0.25rem"}}>💡 Recommendation</p>
              <p>{result.recommendation}</p>
            </div>

            <div className={styles.algoTag}>Algorithm: Logistic Regression (3-class classification)</div>
          </div>
        )}
      </div>
    </div>
  );
}
