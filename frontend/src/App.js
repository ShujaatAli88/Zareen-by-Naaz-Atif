import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Dashboard from "./Components/Dashboard";
import ProductDetail from "./Components/ProductDetail";
import Cart from "./Components/Cart";
import AdminLogin from "./Components/Admin/AdminLogin";
import AdminDashboard from "./Components/Admin/AdminDashboard";
import { CartProvider } from "./Components/CartContext";

function AdminRoute() {
  const [loggedIn, setLoggedIn] = useState(
    () => !!sessionStorage.getItem("adminToken")
  );

  const handleLogout = () => {
    sessionStorage.removeItem("adminToken");
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  }
  return <AdminDashboard onLogout={handleLogout} />;
}

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}
