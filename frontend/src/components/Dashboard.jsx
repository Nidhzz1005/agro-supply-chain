import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../hooks/useWallet";
import { api } from "../api";
import ProductCard from "./ProductCard";
import AddProduct from "./AddProduct";
import UpdateStatus from "./UpdateStatus";
import SellProduct from "./SellProduct";
import ConsolidateShipment from "./ConsolidateShipment";
import DemandForecast from "./DemandForecast";
import SpoilagePredict from "./SpoilagePredict";
import PricePredict from "./PricePredict";
import WalletConnect from "./WalletConnect";
import styles from "./Dashboard.module.css";

const ROLE_ICONS = { Producer:"🌾", Distributor:"🚛", Retailer:"🏪", Consumer:"🛒" };

export default function Dashboard() {
  const { auth, logout } = useAuth();
  const { account, contract, error: walletError, connect } = useWallet();
  const { user } = auth;

  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState("");
  const [filter, setFilter]           = useState("All");
  const [purchases, setPurchases]     = useState([]);

  // Supply chain modals
  const [showAddProduct, setShowAddProduct]     = useState(false);
  const [showConsolidate, setShowConsolidate]   = useState(false);
  const [selectedProduct, setSelectedProduct]   = useState(null);
  const [sellProduct, setSellProduct]           = useState(null);

  // ML modals
  const [showDemand, setShowDemand]     = useState(false);
  const [showSpoilage, setShowSpoilage] = useState(false);
  const [showPrice, setShowPrice]       = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setFetchError("");
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPurchases = useCallback(async () => {
    if (user.role !== "Consumer") return;
    try { setPurchases(await api.getMyPurchases()); } catch {}
  }, [user.role]);

  useEffect(() => { loadProducts(); loadPurchases(); }, [loadProducts, loadPurchases]);

  const visibleProducts = () => {
    let list = products;
    if (user.role === "Distributor") list = products.filter(p => p.status === "Produced");
    if (user.role === "Retailer")    list = products.filter(p => ["In Transit","Delivered","Partially Sold"].includes(p.status));
    if (filter !== "All") list = list.filter(p => p.status === filter);
    return list;
  };

  const stats = {
    total: products.length,
    produced: products.filter(p=>p.status==="Produced").length,
    inTransit: products.filter(p=>p.status==="In Transit").length,
    delivered: products.filter(p=>p.status==="Delivered").length,
    partiallySold: products.filter(p=>p.status==="Partially Sold").length,
    soldOut: products.filter(p=>p.status==="Sold Out").length,
  };

  const filterOptions = {
    Producer:    ["All","Produced","In Transit","Delivered","Partially Sold","Sold Out"],
    Distributor: ["All","Produced"],
    Retailer:    ["All","In Transit","Delivered","Partially Sold","Sold Out"],
    Consumer:    [],
  };

  // ML buttons per role
  const mlButtons = {
    Producer: [
      { label:"📈 Demand Forecast", action:()=>setShowDemand(true),  color:"#1a4731" },
      { label:"💰 Price Predict",   action:()=>setShowPrice(true),   color:"#1565c0" },
    ],
    Distributor: [
      { label:"🥬 Spoilage Risk",   action:()=>setShowSpoilage(true), color:"#c62828" },
      { label:"💰 Price Predict",   action:()=>setShowPrice(true),    color:"#1565c0" },
    ],
    Retailer: [
      { label:"💰 Fair Share Check", action:()=>setShowPrice(true),   color:"#6a1b9a" },
    ],
    Consumer: [],
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>🌾</span>
          <div>
            <h1 className={styles.appName}>Agro Supply Chain</h1>
            <p className={styles.roleTag}>{ROLE_ICONS[user.role]} {user.username} · {user.role}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {user.role !== "Consumer" && <WalletConnect account={account} error={walletError} onConnect={connect} />}
          <button className={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <main className={styles.main}>
        {user.role === "Consumer" ? (
          <ConsumerView purchases={purchases} onRefresh={loadPurchases} />
        ) : (
          <>
            {/* Stats */}
            <div className={styles.stats}>
              <StatCard label="Total"    value={stats.total}        icon="📦" />
              <StatCard label="Produced" value={stats.produced}     icon="🌱" color="#2e7d32" />
              <StatCard label="Transit"  value={stats.inTransit}    icon="🚛" color="#1565c0" />
              <StatCard label="Delivered"value={stats.delivered}    icon="🏪" color="#f57f17" />
              <StatCard label="Partial"  value={stats.partiallySold}icon="🛒" color="#6a1b9a" />
              <StatCard label="Sold Out" value={stats.soldOut}      icon="✅" color="#880e4f" />
            </div>

            {/* ML Buttons */}
            {mlButtons[user.role]?.length > 0 && (
              <div className={styles.mlBar}>
                <span className={styles.mlBarLabel}>🤖 ML Insights</span>
                {mlButtons[user.role].map(btn => (
                  <button key={btn.label} className={styles.mlBtn}
                    style={{background: btn.color}} onClick={btn.action}>
                    {btn.label}
                  </button>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className={styles.toolbar}>
              <div className={styles.filters}>
                {(filterOptions[user.role]||[]).map(s=>(
                  <button key={s}
                    className={filter===s ? styles.filterActive : styles.filter}
                    onClick={()=>setFilter(s)}>{s}</button>
                ))}
              </div>
              <div className={styles.toolbarRight}>
                <button className={styles.refreshBtn} onClick={loadProducts}>🔄</button>
                {user.role === "Producer" && (
                  <button className={styles.addBtn} onClick={()=>setShowAddProduct(true)}>➕ Add Product</button>
                )}
                {user.role === "Distributor" && (
                  <button className={styles.addBtn} onClick={()=>setShowConsolidate(true)}>📦 Create Shipment</button>
                )}
              </div>
            </div>

            <RoleHint role={user.role} />

            {/* Products */}
            {loading ? (
              <div className={styles.center}><div className={styles.spinner}/></div>
            ) : fetchError ? (
              <div className={styles.errorBox}><p>⚠️ {fetchError}</p><button onClick={loadProducts}>Retry</button></div>
            ) : visibleProducts().length === 0 ? (
              <div className={styles.empty}>
                <p>🌿</p><p>{emptyMessage(user.role)}</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {visibleProducts().map(product=>(
                  <ProductCard key={product._id} product={product} userRole={user.role}
                    onUpdateClick={setSelectedProduct} onSellClick={setSellProduct} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Supply Chain Modals */}
      {showAddProduct  && <AddProduct contract={contract} onClose={()=>setShowAddProduct(false)} onAdded={p=>setProducts(prev=>[p,...prev])} />}
      {showConsolidate && <ConsolidateShipment products={products} contract={contract} onClose={()=>setShowConsolidate(false)} onDone={()=>loadProducts()} />}
      {selectedProduct && <UpdateStatus product={selectedProduct} userRole={user.role} contract={contract} onClose={()=>setSelectedProduct(null)} onUpdated={u=>setProducts(prev=>prev.map(p=>p._id===u._id?u:p))} />}
      {sellProduct     && <SellProduct product={sellProduct} contract={contract} onClose={()=>setSellProduct(null)} onSold={u=>setProducts(prev=>prev.map(p=>p._id===u._id?u:p))} />}

      {/* ML Modals */}
      {showDemand   && <DemandForecast onClose={()=>setShowDemand(false)} />}
      {showSpoilage && <SpoilagePredict onClose={()=>setShowSpoilage(false)} />}
      {showPrice    && <PricePredict showFairShare={user.role==="Retailer"} onClose={()=>setShowPrice(false)} />}
    </div>
  );
}

function RoleHint({ role }) {
  const hints = {
    Producer:    "Add products and use ML tools to forecast demand and check fair prices before selling.",
    Distributor: "Consolidate products into shipments and check spoilage risk before dispatching.",
    Retailer:    "Mark products delivered, sell in smaller quantities, and verify producer fair share.",
  };
  if (!hints[role]) return null;
  return (
    <div style={{background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:8,padding:"0.6rem 1rem",fontSize:"0.85rem",color:"#2e7d32"}}>
      💡 {hints[role]}
    </div>
  );
}

function ConsumerView({ purchases, onRefresh }) {
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
        <h2 style={{color:"#1a4731"}}>🛒 My Purchases</h2>
        <button onClick={onRefresh} style={{padding:"0.4rem 0.8rem",background:"#2d7a4f",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600}}>🔄 Refresh</button>
      </div>
      {purchases.length === 0 ? (
        <div style={{textAlign:"center",padding:"3rem",color:"#aaa",background:"#fff",borderRadius:12,border:"2px dashed #d0e8d0"}}>
          <p style={{fontSize:"2rem"}}>🛒</p>
          <p>No purchases yet. Ask a Retailer to sell you some products!</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          {purchases.map((item,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:12,padding:"1rem 1.25rem",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",border:"1px solid #e8f5e9"}}>
              <h3 style={{fontSize:"1rem",fontWeight:700,color:"#1a4731",marginBottom:"0.25rem"}}>{item.productName}</h3>
              <p style={{fontSize:"0.82rem",color:"#888",marginBottom:"0.5rem"}}>📍 {item.location} · 👤 by {item.producerUsername}</p>
              {item.purchases.map((p,j)=>(
                <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"0.3rem 0",borderTop:"1px solid #f0f0f0",fontSize:"0.88rem"}}>
                  <span style={{color:"#555"}}>{new Date(p.soldAt).toLocaleDateString()}</span>
                  <span style={{fontWeight:700,color:"#2d7a4f"}}>{p.quantity}kg purchased</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function emptyMessage(role) {
  if (role==="Producer")    return "No products yet. Add your first product!";
  if (role==="Distributor") return "No Produced products available to ship yet.";
  if (role==="Retailer")    return "No products assigned to you yet.";
  return "Nothing to show.";
}

function StatCard({ label, value, icon, color="#1a4731" }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statIcon}>{icon}</span>
      <div>
        <p className={styles.statValue} style={{color}}>{value}</p>
        <p className={styles.statLabel}>{label}</p>
      </div>
    </div>
  );
}
