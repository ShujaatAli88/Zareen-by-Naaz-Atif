import { useState, useEffect, useRef } from "react";
import "./Admin.css";
import AdminOrders from "./AdminOrders";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
const BADGES = ["NEW IN", "EID COLLECTION", "READY TO WEAR", "FABRICS", "SALE"];

const emptyForm = { name: "", price: "", badge: "NEW IN", description: "" };

export default function AdminDashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState("products");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState("");
  const fileInputRef = useRef();

  // ── Fetch products ──────────────────────────────────────────
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/products`);
      setProducts(await res.json());
    } catch {
      showToast("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // ── Toast helper ────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // ── Image picker ────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // ── Open Add modal ──────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setEditId(null);
    setModal("add");
  };

  // ── Open Edit modal ─────────────────────────────────────────
  const openEdit = (product) => {
    setForm({
      name: product.name,
      price: product.price,
      badge: product.badge,
      description: product.description || "",
    });
    setImageFile(null);
    setImagePreview(product.img);
    setEditId(product._id);
    setModal("edit");
  };

  // ── Close modal ─────────────────────────────────────────────
  const closeModal = () => {
    setModal(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setEditId(null);
  };

  // ── Submit form (add or edit) ────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("price", form.price);
      fd.append("badge", form.badge);
      fd.append("description", form.description);
      if (imageFile) fd.append("image", imageFile);

      const url =
        modal === "edit"
          ? `${API}/api/products/${editId}`
          : `${API}/api/products`;

      const res = await fetch(url, {
        method: modal === "edit" ? "PUT" : "POST",
        body: fd,
      });

      if (res.ok) {
        showToast(modal === "edit" ? "Product updated!" : "Product added!");
        closeModal();
        fetchProducts();
      } else {
        const err = await res.json();
        showToast(err.error || "Something went wrong");
      }
    } catch {
      showToast("Server error. Is the backend running?");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete product ───────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/api/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Product deleted");
        setProducts((prev) => prev.filter((p) => p._id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Delete failed");
        fetchProducts();
      }
    } catch {
      showToast("Server error");
      fetchProducts();
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="admin-page">
      {/* ── Sidebar / Top bar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <span className="admin-brand-main">ZAREEN'S</span>
          <span className="admin-brand-sub">Admin Panel</span>
        </div>
        <nav className="admin-nav">
          <div className={`admin-nav-item ${activeSection === "products" ? "active" : ""}`} onClick={() => setActiveSection("products")}>📦 Products</div>
          <div className={`admin-nav-item ${activeSection === "orders" ? "active" : ""}`} onClick={() => setActiveSection("orders")}>🛍️ All Orders</div>
        </nav>
        <button className="admin-logout-btn" onClick={onLogout}>Logout</button>
      </aside>

      {/* ── Bottom Nav (Mobile) ── */}
      <nav className="admin-bottom-nav">
        <div className={`admin-bottom-nav-item ${activeSection === "products" ? "active" : ""}`} onClick={() => setActiveSection("products")}>
          <span className="nav-icon">📦</span>
          Products
        </div>
        <div className={`admin-bottom-nav-item ${activeSection === "orders" ? "active" : ""}`} onClick={() => setActiveSection("orders")}>
          <span className="nav-icon">🛍️</span>
          Orders
        </div>
        <div className="admin-bottom-nav-item" onClick={onLogout}>
          <span className="nav-icon">🚪</span>
          Logout
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="admin-main">
        {activeSection === "orders" ? <AdminOrders /> : (<>
        {/* Header */}
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Products</h1>
            <p className="admin-subtitle">{products.length} items in catalog</p>
          </div>
          <button className="admin-btn-primary" onClick={openAdd}>
            + Add Product
          </button>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="admin-loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="admin-empty">
            <p>No products yet.</p>
            <button className="admin-btn-primary" onClick={openAdd}>
              Add your first product
            </button>
          </div>
        ) : (
          <div className="admin-products-grid">
            {products.map((p) => (
              <div key={p._id} className="admin-product-card">
                <div className="admin-product-img-wrapper">
                  <img
                    src={p.img || "https://via.placeholder.com/300x350?text=No+Image"}
                    alt={p.name}
                    className="admin-product-img"
                  />
                  <span className="admin-product-badge">{p.badge}</span>
                </div>
                <div className="admin-product-info">
                  <p className="admin-product-name">{p.name}</p>
                  <p className="admin-product-price">{p.price}</p>
                  {p.description && (
                    <p className="admin-product-desc">{p.description}</p>
                  )}
                </div>
                <div className="admin-product-actions">
                  <button
                    className="admin-btn-edit"
                    onClick={() => openEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    className="admin-btn-delete"
                    onClick={() => setDeleteConfirm(p._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </>)}
      </main>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h2>{modal === "edit" ? "Edit Product" : "Add New Product"}</h2>
              <button className="admin-modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-modal-form">
              {/* Image upload */}
              <div className="admin-form-group">
                <label className="admin-label">Product Image</label>
                <div
                  className="admin-image-upload"
                  onClick={() => fileInputRef.current.click()}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="admin-image-preview"
                    />
                  ) : (
                    <div className="admin-image-placeholder">
                      <span>Click to upload image</span>
                      <span className="admin-image-hint">JPG, PNG, WEBP — max 10MB</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <button
                    type="button"
                    className="admin-btn-text"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(modal === "edit" ? imagePreview : "");
                      fileInputRef.current.value = "";
                    }}
                  >
                    Change image
                  </button>
                )}
              </div>

              {/* Name */}
              <div className="admin-form-group">
                <label className="admin-label">Product Name *</label>
                <input
                  className="admin-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rose Embroidered Kurta"
                  required
                />
              </div>

              {/* Price */}
              <div className="admin-form-group">
                <label className="admin-label">Price *</label>
                <input
                  className="admin-input"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. PKR 4,850"
                  required
                />
              </div>

              {/* Badge */}
              <div className="admin-form-group">
                <label className="admin-label">Badge</label>
                <select
                  className="admin-input"
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                >
                  {BADGES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="admin-form-group">
                <label className="admin-label">Description</label>
                <textarea
                  className="admin-input admin-textarea"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Write a short product description..."
                  rows={3}
                />
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : modal === "edit"
                    ? "Save Changes"
                    : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteConfirm && (
        <div className="admin-modal-overlay">
          <div className="admin-modal admin-modal-sm">
            <h3 className="admin-confirm-title">Delete Product?</h3>
            <p className="admin-confirm-text">
              This action cannot be undone. The product will be permanently removed.
            </p>
            <div className="admin-modal-footer">
              <button
                className="admin-btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="admin-btn-delete-confirm"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && <div className="admin-toast">{toast}</div>}
    </div>
  );
}
