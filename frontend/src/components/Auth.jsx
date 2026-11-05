import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import styles from "./Auth.module.css";

export default function Auth() {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", role: "Producer" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data =
        mode === "register"
          ? await api.register(form)
          : await api.login({ username: form.username, password: form.password });
      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🌾</div>
        <h1 className={styles.title}>Agro Supply Chain</h1>
        <p className={styles.subtitle}>Transparent. Traceable. Trusted.</p>

        <div className={styles.tabs}>
          <button className={mode === "login" ? styles.tabActive : styles.tab}
            onClick={() => { setMode("login"); setError(""); }}>Login</button>
          <button className={mode === "register" ? styles.tabActive : styles.tab}
            onClick={() => { setMode("register"); setError(""); }}>Register</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Username</label>
            <input name="username" value={form.username} onChange={handleChange}
              placeholder="Enter username" required autoComplete="username" />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input type="password" name="password" value={form.password}
              onChange={handleChange} placeholder="Enter password" required />
          </div>
          {mode === "register" && (
            <div className={styles.field}>
              <label>Role</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option>Producer</option>
                <option>Distributor</option>
                <option>Retailer</option>
                <option>Consumer</option>
              </select>
            </div>
          )}
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
