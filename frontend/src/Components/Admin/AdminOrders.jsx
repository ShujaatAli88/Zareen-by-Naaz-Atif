import { useState, useEffect } from "react";
import "./Admin.css";
import "./AdminOrders.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const STATUS_META = {
  pending:    { label: "Pending",    icon: "⏳", accent: "#b8860b", bg: "#fff8e1", border: "#f5d980" },
  processing: { label: "Processing", icon: "🔄", accent: "#1565c0", bg: "#e3f2fd", border: "#90c8f8" },
  delivered:  { label: "Delivered",  icon: "✅", accent: "#2e7d32", bg: "#e8f5e9", border: "#81c784" },
  cancelled:  { label: "Cancelled",  icon: "🚫", accent: "#c62828", bg: "#fce4ec", border: "#ef9a9a" },
};

const STATUS_ORDER = ["pending", "processing", "delivered", "cancelled"];

export default function AdminOrders() {
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState("pending");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId,    setUpdatingId]    = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingId,    setDeletingId]    = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    fetch(`${API}/api/orders`)
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await fetch(`${API}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder?._id === orderId) {
        setSelectedOrder((o) => ({ ...o, status: newStatus }));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setOrders((prev) => prev.filter((o) => o._id !== id));
      if (selectedOrder?._id === id) setSelectedOrder(null);
    } catch {
      fetchOrders();
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const orderId = (o) => `ORD-${String(o._id).slice(-6).toUpperCase()}`;
  const qty     = (o) => o.quantity ?? 1;

  // Group by status
  const grouped = STATUS_ORDER.reduce((acc, key) => {
    acc[key] = orders.filter((o) => o.status === key);
    return acc;
  }, {});

  const tabOrders = grouped[activeTab] || [];
  const meta      = STATUS_META[activeTab];

  return (
    <div className="ao-page">

      {/* ── Header ── */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">All Orders</h1>
          <p className="admin-subtitle">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
        </div>
        <button className="admin-btn-primary" onClick={fetchOrders}>Refresh</button>
      </div>

      {loading ? (
        <div className="admin-loading">Loading orders…</div>
      ) : (
        <>
          {/* ── Tab Bar ── */}
          <div className="ao-tabs">
            {STATUS_ORDER.map((key) => {
              const m       = STATUS_META[key];
              const count   = grouped[key].length;
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  className={`ao-tab${isActive ? " ao-tab--active" : ""}`}
                  style={isActive ? {
                    borderBottom: `3px solid ${m.accent}`,
                    color: m.accent,
                    background: m.bg,
                  } : {}}
                  onClick={() => setActiveTab(key)}
                >
                  <span className="ao-tab-icon">{m.icon}</span>
                  <span className="ao-tab-label">{m.label}</span>
                  <span
                    className="ao-tab-count"
                    style={isActive
                      ? { background: m.accent, color: "#fff" }
                      : { background: "#f0f0f0", color: "#666" }
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Tab Panel ── */}
          <div className="ao-panel">
            {tabOrders.length === 0 ? (
              <div className="ao-panel-empty">
                <span className="ao-panel-empty-icon">{meta.icon}</span>
                <p>No {meta.label.toLowerCase()} orders right now</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="ao-cards">
                  {tabOrders.map((o) => (
                    <div key={o._id} className="ao-card" onClick={() => setSelectedOrder(o)}>
                      <div className="ao-card-top">
                        <span className="ao-card-id">{orderId(o)}</span>
                        <span
                          className="ao-status-pill"
                          style={{ background: meta.bg, color: meta.accent }}
                        >
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <div className="ao-card-body">
                        <div className="ao-card-field">
                          <span className="ao-card-label">Customer</span>
                          <span className="ao-card-value">{o.customerName}</span>
                        </div>
                        <div className="ao-card-field">
                          <span className="ao-card-label">Phone</span>
                          <span className="ao-card-value">{o.phone}</span>
                        </div>
                        <div className="ao-card-field">
                          <span className="ao-card-label">Product</span>
                          <span className="ao-card-value">{o.productName}</span>
                        </div>
                        <div className="ao-card-field">
                          <span className="ao-card-label">Size / Qty</span>
                          <span className="ao-card-value">{o.size} × {qty(o)}</span>
                        </div>
                        <div className="ao-card-field">
                          <span className="ao-card-label">Total</span>
                          <span className="ao-card-value total">{o.totalAmount}</span>
                        </div>
                        <div className="ao-card-field">
                          <span className="ao-card-label">Date</span>
                          <span className="ao-card-value">{formatDate(o.createdAt)}</span>
                        </div>
                      </div>
                      <div className="ao-card-actions" onClick={(e) => e.stopPropagation()}>
                        <select
                          className="ao-status-select"
                          value={o.status}
                          style={{ background: meta.bg, color: meta.accent }}
                          disabled={updatingId === o._id}
                          onChange={(e) => updateStatus(o._id, e.target.value)}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>{STATUS_META[s].label}</option>
                          ))}
                        </select>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="ao-view-btn"   onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }}>View</button>
                          <button className="ao-delete-btn" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(o._id); }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="ao-table-wrapper">
                  <table className="ao-table">
                    <thead>
                      <tr>
                        <th>Order ID</th><th>Customer</th><th>Product</th>
                        <th>Size</th><th>Qty</th><th>Total</th>
                        <th>Status</th><th>Date</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabOrders.map((o) => (
                        <tr key={o._id} className="ao-row" onClick={() => setSelectedOrder(o)}>
                          <td className="ao-order-id">{orderId(o)}</td>
                          <td>
                            <div className="ao-customer-name">{o.customerName}</div>
                            <div className="ao-customer-sub">{o.phone}</div>
                          </td>
                          <td className="ao-product">{o.productName}</td>
                          <td><span className="ao-size-badge">{o.size}</span></td>
                          <td className="ao-qty">{qty(o)}</td>
                          <td className="ao-total">{o.totalAmount}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <select
                              className="ao-status-select"
                              value={o.status}
                              style={{ background: meta.bg, color: meta.accent }}
                              disabled={updatingId === o._id}
                              onChange={(e) => updateStatus(o._id, e.target.value)}
                            >
                              {STATUS_ORDER.map((s) => (
                                <option key={s} value={s}>{STATUS_META[s].label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="ao-date">{formatDate(o.createdAt)}</td>
                          <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                            <button className="ao-view-btn"   onClick={() => setSelectedOrder(o)} style={{ marginRight: 6 }}>View</button>
                            <button className="ao-delete-btn" onClick={() => setDeleteConfirm(o._id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="admin-modal ao-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{orderId(selectedOrder)}</h2>
              <button className="admin-modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            <div className="ao-detail-body">
              <div className="ao-detail-status">
                <span
                  className="ao-status-pill"
                  style={{
                    background: STATUS_META[selectedOrder.status]?.bg,
                    color: STATUS_META[selectedOrder.status]?.accent,
                    border: `1px solid ${STATUS_META[selectedOrder.status]?.border}`,
                  }}
                >
                  {STATUS_META[selectedOrder.status]?.icon} {selectedOrder.status.toUpperCase()}
                </span>
                <span className="ao-detail-date">{formatDate(selectedOrder.createdAt)}</span>
              </div>

              <div className="ao-detail-section">
                <h4>Customer Details</h4>
                <div className="ao-detail-grid">
                  <div className="ao-detail-item"><span>Name</span><strong>{selectedOrder.customerName}</strong></div>
                  <div className="ao-detail-item"><span>Phone</span><strong>{selectedOrder.phone}</strong></div>
                  <div className="ao-detail-item"><span>Email</span><strong>{selectedOrder.email}</strong></div>
                </div>
              </div>

              <div className="ao-detail-section">
                <h4>Delivery Address</h4>
                <p className="ao-detail-address">{selectedOrder.deliveryAddress}</p>
              </div>

              <div className="ao-detail-section">
                <h4>Order Details</h4>
                <div className="ao-detail-grid">
                  <div className="ao-detail-item"><span>Product</span><strong>{selectedOrder.productName}</strong></div>
                  <div className="ao-detail-item"><span>Size</span><strong>{selectedOrder.size}</strong></div>
                  <div className="ao-detail-item"><span>Quantity</span><strong>{qty(selectedOrder)}</strong></div>
                  <div className="ao-detail-item"><span>Product Price</span><strong>{selectedOrder.productPrice}</strong></div>
                  <div className="ao-detail-item"><span>Delivery Charges</span><strong>PKR {(selectedOrder.deliveryCharges || 200).toLocaleString()}</strong></div>
                </div>
              </div>

              <div className="ao-detail-total">
                <span>Total Amount</span>
                <span className="ao-detail-total-value">{selectedOrder.totalAmount}</span>
              </div>

              <div className="ao-detail-section">
                <h4>Move to Status</h4>
                <div className="ao-status-btns">
                  {STATUS_ORDER.map((s) => {
                    const m        = STATUS_META[s];
                    const isActive = selectedOrder.status === s;
                    return (
                      <button
                        key={s}
                        className={`ao-status-btn${isActive ? " active" : ""}`}
                        style={isActive ? { background: m.bg, color: m.accent, borderColor: m.border } : {}}
                        onClick={() => updateStatus(selectedOrder._id, s)}
                        disabled={updatingId === selectedOrder._id || isActive}
                      >
                        {m.icon} {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                className="ao-delete-btn-full"
                onClick={() => setDeleteConfirm(selectedOrder._id)}
                disabled={deletingId === selectedOrder._id}
              >
                {deletingId === selectedOrder._id ? "Deleting…" : "Delete This Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Delete Order?</h2>
              <button className="admin-modal-close" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div style={{ padding: "16px 24px 24px" }}>
              <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
                This will permanently remove the order. This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="ao-delete-btn-full"
                  onClick={() => handleDeleteOrder(deleteConfirm)}
                  disabled={deletingId === deleteConfirm}
                >
                  {deletingId === deleteConfirm ? "Deleting…" : "Yes, Delete"}
                </button>
                <button className="ao-status-btn" onClick={() => setDeleteConfirm(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
