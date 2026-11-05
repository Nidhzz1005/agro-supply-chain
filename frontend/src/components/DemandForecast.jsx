import React, { useState } from "react";
import { api } from "../api";
import styles from "./MLPanel.module.css";

const CITIES = ["Nashik","Mumbai","Pune","Delhi","Bangalore","Hyderabad","Chennai","Kolkata"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DemandForecast({ cropName, onClose }) {
  const [form, setForm] = useState({
    crop: cropName || "",
    city: "Mumbai",
    month: new Date().getMonth() + 1,
    lastMonthQty: "",
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
      const data = await api.predictDemand({
        crop: form.crop,
        city: form.city,
        month: Number(form.month),
        lastMonthQty: Number(form.lastMonthQty) || 200,
      });
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
            <h2>📈 Demand Forecast</h2>
            <p className={styles.subtitle}>Random Forest Regressor</p>
          </div>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handlePredict} className={styles.form}>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>Crop Name</label>
              <input value={form.crop} onChange={e => setForm(f=>({...f,crop:e.target.value}))}
                placeholder="e.g. Wheat" required />
            </div>
            <div className={styles.field}>
              <label>Target City</label>
              <select value={form.city} onChange={e => setForm(f=>({...f,city:e.target.value}))}>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Month</label>
              <select value={form.month} onChange={e => setForm(f=>({...f,month:e.target.value}))}>
                {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Last Month Qty (kg)</label>
              <input type="number" min="0" value={form.lastMonthQty}
                onChange={e => setForm(f=>({...f,lastMonthQty:e.target.value}))}
                placeholder="e.g. 300" />
            </div>
          </div>

          {error && <p className={styles.error}>⚠️ {error}</p>}

          <button type="submit" className={styles.predictBtn} disabled={loading}>
            {loading ? "Predicting…" : "🔮 Forecast Demand"}
          </button>
        </form>

        {result && (
          <div className={styles.result}>
            <div className={styles.bigNumber}>
              <span className={styles.bigVal}>{result.predictedDemand}</span>
              <span className={styles.bigUnit}>kg</span>
            </div>
            <p className={styles.bigLabel}>Predicted demand for {result.crop} in {result.city}</p>

            <div className={styles.infoRow}>
              <InfoChip label="Last Month" value={`${result.lastMonthQty} kg`} />
              <InfoChip label="Predicted" value={`${result.predictedDemand} kg`} color="#2d7a4f" />
            </div>

            <div className={styles.insightBox}>
              <p>{result.trend}</p>
              <p style={{marginTop:"0.4rem", color:"#444"}}>{result.suggestion}</p>
            </div>

            <div className={styles.algoTag}>Algorithm: Random Forest Regressor</div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoChip({ label, value, color="#555" }) {
  return (
    <div className={styles.chip}>
      <span className={styles.chipLabel}>{label}</span>
      <span className={styles.chipValue} style={{color}}>{value}</span>
    </div>
  );
}
