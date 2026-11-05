import React from "react";
import styles from "./WalletConnect.module.css";

export default function WalletConnect({ account, error, onConnect }) {
  const short = (addr) => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  return (
    <div className={styles.wrapper}>
      {account ? (
        <div className={styles.connected}>
          <span className={styles.dot} />
          <span className={styles.addr}>{short(account)}</span>
        </div>
      ) : (
        <button className={styles.btn} onClick={onConnect}>
          🦊 Connect Wallet
        </button>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
