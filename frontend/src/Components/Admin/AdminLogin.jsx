import { useState } from "react";
import "./Admin.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem("adminToken", data.token);
        onLogin();
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Cannot connect to server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <span className="admin-brand-main">ZAREEN'S</span>
          <span className="admin-brand-sub">WARDROBE — Admin</span>
        </div>
        <h2 className="admin-login-title">Admin Portal</h2>
        <p className="admin-login-hint">Enter your admin password to continue</p>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-form-group">
            <label className="admin-label">Password</label>
            <input
              type="password"
              className="admin-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
            />
          </div>
          {error && <p className="admin-error">{error}</p>}
          <button type="submit" className="admin-btn-primary" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="admin-back-link" onClick={() => window.history.back()}>
          ← Back to store
        </p>
      </div>
    </div>
  );
}
