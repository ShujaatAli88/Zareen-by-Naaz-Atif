import { useState, useEffect } from "react";
import "./Admin.css";
import "./AdminOrders.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
const STATUS_COLORS = {
  pending:    { bg: "#fff8e1", color: "#b8860b" },
  processing: { bg: "#e3f2fd", color: "#1565c0" },
  delivered:  { bg: "#e8f5e9", color: "#2e7d32" },
  cancelled:  { bg: "#fce4ec", color: "#c62828" },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    fetch(`${API}/api/orders`)
      .then((r) => r.json())
      .then((data) => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await fetch(`${API}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchOrders();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder((o) => ({ ...o, status }));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setOrders((prev) => prev.filter((o) => o._id !== id));
      if (selectedOrder?._id === id) setSelectedOrder(null);
    } catch {
      // Backend delete failed — re-fetch so state matches database
      fetchOrders();
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const orderId = (o) => `ORD-${String(o._id).slice(-6).toUpperCase()}`;

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
        <div className="admin-loading">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="admin-empty">
          <p>No orders yet. They will appear here when customers place orders.</p>
        </div>
      ) : (
        <div className="ao-table-wrapper">
          {/* ── Mobile Cards ── */}
          {orders.map((o) => (
            <div key={o._id} className="ao-card" onClick={() => setSelectedOrder(o)}>
              <div className="ao-card-top">
                <span className="ao-card-id">{orderId(o)}</span>
                <span className="ao-status-pill" style={{ background: STATUS_COLORS[o.status]?.bg, color: STATUS_COLORS[o.status]?.color }}>
                  {o.status.toUpperCase()}
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
                  <span className="ao-card-label">Total</span>
                  <span className="ao-card-value total">{o.totalAmount}</span>
                </div>
              </div>
              <div className="ao-card-actions" onClick={(e) => e.stopPropagation()}>
                <select
                  className="ao-status-select"
                  value={o.status}
                  style={{ background: STATUS_COLORS[o.status]?.bg, color: STATUS_COLORS[o.status]?.color }}
                  disabled={updatingId === o._id}
                  onChange={(e) => updateStatus(o._id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="ao-view-btn" onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }}>View</button>
                  <button className="ao-delete-btn" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(o._id); }}>Delete</button>
                </div>
              </div>
            </div>
          ))}

          {/* ── Desktop Table ── */}
          <table className="ao-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Size</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className="ao-row" onClick={() => setSelectedOrder(o)}>
                  <td className="ao-order-id">{orderId(o)}</td>
                  <td>
                    <div className="ao-customer-name">{o.customerName}</div>
                    <div className="ao-customer-sub">{o.phone}</div>
                  </td>
                  <td className="ao-product">{o.productName}</td>
                  <td><span className="ao-size-badge">{o.size}</span></td>
                  <td className="ao-total">{o.totalAmount}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="ao-status-select"
                      value={o.status}
                      style={{ background: STATUS_COLORS[o.status]?.bg, color: STATUS_COLORS[o.status]?.color }}
                      disabled={updatingId === o._id}
                      onChange={(e) => updateStatus(o._id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="ao-date">{formatDate(o.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                    <button className="ao-view-btn" onClick={() => setSelectedOrder(o)} style={{ marginRight: 6 }}>View</button>
                    <button className="ao-delete-btn" onClick={() => setDeleteConfirm(o._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              {/* Status */}
              <div className="ao-detail-status">
                <span
                  className="ao-status-pill"
                  style={{ background: STATUS_COLORS[selectedOrder.status]?.bg, color: STATUS_COLORS[selectedOrder.status]?.color }}
                >
                  {selectedOrder.status.toUpperCase()}
                </span>
                <span className="ao-detail-date">{formatDate(selectedOrder.createdAt)}</span>
              </div>

              {/* Customer */}
              <div className="ao-detail-section">
                <h4>Customer Details</h4>
                <div className="ao-detail-grid">
                  <div className="ao-detail-item"><span>Name</span><strong>{selectedOrder.customerName}</strong></div>
                  <div className="ao-detail-item"><span>Phone</span><strong>{selectedOrder.phone}</strong></div>
                  <div className="ao-detail-item"><span>Email</span><strong>{selectedOrder.email}</strong></div>
                </div>
              </div>

              {/* Delivery */}
              <div className="ao-detail-section">
                <h4>Delivery Address</h4>
                <p className="ao-detail-address">{selectedOrder.deliveryAddress}</p>
              </div>

              {/* Product */}
              <div className="ao-detail-section">
                <h4>Order Details</h4>
                <div className="ao-detail-grid">
                  <div className="ao-detail-item"><span>Product</span><strong>{selectedOrder.productName}</strong></div>
                  <div className="ao-detail-item"><span>Size</span><strong>{selectedOrder.size}</strong></div>
                  <div className="ao-detail-item"><span>Product Price</span><strong>{selectedOrder.productPrice}</strong></div>
                  <div className="ao-detail-item"><span>Delivery Charges</span><strong>PKR 200</strong></div>
                </div>
              </div>

              {/* Total */}
              <div className="ao-detail-total">
                <span>Total Amount</span>
                <span className="ao-detail-total-value">{selectedOrder.totalAmount}</span>
              </div>

              {/* Update status */}
              <div className="ao-detail-section">
                <h4>Update Status</h4>
                <div className="ao-status-btns">
                  {["pending", "processing", "delivered", "cancelled"].map((s) => (
                    <button
                      key={s}
                      className={`ao-status-btn ${selectedOrder.status === s ? "active" : ""}`}
                      style={selectedOrder.status === s ? { background: STATUS_COLORS[s]?.bg, color: STATUS_COLORS[s]?.color, borderColor: STATUS_COLORS[s]?.color } : {}}
                      onClick={() => updateStatus(selectedOrder._id, s)}
                      disabled={updatingId === selectedOrder._id}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete */}
              <button
                className="ao-delete-btn-full"
                onClick={() => setDeleteConfirm(selectedOrder._id)}
                disabled={deletingId === selectedOrder._id}
              >
                {deletingId === selectedOrder._id ? "Deleting..." : "Delete This Order"}
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
                This will permanently remove the order from the database. This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="ao-delete-btn-full"
                  onClick={() => handleDeleteOrder(deleteConfirm)}
                  disabled={deletingId === deleteConfirm}
                >
                  {deletingId === deleteConfirm ? "Deleting..." : "Yes, Delete"}
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
