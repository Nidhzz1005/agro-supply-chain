const BASE = "/";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(BASE + path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    if (text.startsWith("Proxy error")) {
      throw new Error("Backend not reachable. Start Terminal 3 (npm run dev) and MongoDB.");
    }
    throw new Error("Unexpected response from server");
  }
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const api = {
  register:       (body) => request("auth/register",           { method: "POST", body: JSON.stringify(body) }),
  login:          (body) => request("auth/login",              { method: "POST", body: JSON.stringify(body) }),
  getProducts:    ()     => request("products"),
  getShipments:   ()     => request("products/shipments"),
  createProduct:  (body) => request("product/create",          { method: "POST", body: JSON.stringify(body) }),
  consolidate:    (body) => request("product/consolidate",     { method: "POST", body: JSON.stringify(body) }),
  updateStatus:   (body) => request("product/update-status",   { method: "PUT",  body: JSON.stringify(body) }),
  sell:           (body) => request("product/sell",            { method: "POST", body: JSON.stringify(body) }),
  getMyPurchases: ()     => request("product/my-purchases"),
  // ML
  predictDemand:  (body) => request("ml/demand",  { method: "POST", body: JSON.stringify(body) }),
  predictSpoilage:(body) => request("ml/spoilage",{ method: "POST", body: JSON.stringify(body) }),
  predictPrice:   (body) => request("ml/price",   { method: "POST", body: JSON.stringify(body) }),
};
