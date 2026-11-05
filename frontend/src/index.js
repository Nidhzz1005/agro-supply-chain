import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";

function App() {
  const { auth } = useAuth();
  return auth ? <Dashboard /> : <Auth />;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
